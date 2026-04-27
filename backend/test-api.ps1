$ErrorActionPreference = "Stop"

$BASE_URL = "http://localhost:3000/api"

function Step($msg) {
  Write-Host ""
  Write-Host "==== $msg ====" -ForegroundColor Cyan
}

function Assert-Success($resp, $stepName) {
  if (-not $resp.success) {
    throw "[$stepName] failed: $($resp | ConvertTo-Json -Depth 10)"
  }
}

function Assert-Fail($resp, $stepName) {
  if ($resp.success) {
    throw "[$stepName] expected failure but got success: $($resp | ConvertTo-Json -Depth 10)"
  }
}

Step "Step 0: Health Check"
$health = Invoke-RestMethod -Method Get -Uri "$BASE_URL/health"
Assert-Success $health "health"
$health | ConvertTo-Json -Depth 10 | Write-Host

Step "Step 1: Login user1"
$u1 = Invoke-RestMethod -Method Post -Uri "$BASE_URL/auth/login" -ContentType "application/json" -Body '{"wechatOpenid":"wx_test_u1","nickname":"User1"}'
Assert-Success $u1 "auth.login u1"
$USER_ID = [int]$u1.data.id
Write-Host "USER_ID=$USER_ID"

Step "Step 2: Create saving account"
$saving = Invoke-RestMethod -Method Post -Uri "$BASE_URL/bank-accounts" -ContentType "application/json" -Body (@{
  userId = $USER_ID
  accountName = "Saving Card A"
  bankName = "CMB"
  balance = 5000
} | ConvertTo-Json)
Assert-Success $saving "create saving account"
$SAVING_ACCOUNT_ID = [int]$saving.data.id
Write-Host "SAVING_ACCOUNT_ID=$SAVING_ACCOUNT_ID"

Step "Step 3: Create finance account"
$finance = Invoke-RestMethod -Method Post -Uri "$BASE_URL/finance-accounts" -ContentType "application/json" -Body (@{
  userId = $USER_ID
  accountName = "Stock Account A"
  provider = "Broker A"
  principalAmount = 100000
  expectedAnnualRate = 0.10
} | ConvertTo-Json)
Assert-Success $finance "create finance account"
$FINANCE_ACCOUNT_ID = [int]$finance.data.id
Write-Host "FINANCE_ACCOUNT_ID=$FINANCE_ACCOUNT_ID"

Step "Step 4: List accounts"
$savingList = Invoke-RestMethod -Method Get -Uri "$BASE_URL/bank-accounts?userId=$USER_ID"
Assert-Success $savingList "list saving accounts"
$financeList = Invoke-RestMethod -Method Get -Uri "$BASE_URL/finance-accounts?userId=$USER_ID"
Assert-Success $financeList "list finance accounts"

Step "Step 5: Create daily budget"
$dailyBudget = Invoke-RestMethod -Method Post -Uri "$BASE_URL/budgets" -ContentType "application/json" -Body (@{
  userId = $USER_ID
  periodType = "daily"
  budgetDate = "2026-03-26"
  plannedAmount = 120
} | ConvertTo-Json)
Assert-Success $dailyBudget "create daily budget"

Step "Step 6: Create finance_interest budget"
$fiBudget = Invoke-RestMethod -Method Post -Uri "$BASE_URL/budgets" -ContentType "application/json" -Body (@{
  userId = $USER_ID
  periodType = "finance_interest"
  budgetMonth = "2026-03"
  accountId = $FINANCE_ACCOUNT_ID
  plannedAnnualRate = 0.10
  plannedPrincipalAmount = 100000
} | ConvertTo-Json)
Assert-Success $fiBudget "create finance_interest budget"
$BUDGET_ID = [int]$fiBudget.data.id
Write-Host "BUDGET_ID=$BUDGET_ID"
Write-Host "planned_interest_amount=$($fiBudget.data.planned_interest_amount)"

Step "Step 7: List budgets"
$budgets = Invoke-RestMethod -Method Get -Uri "$BASE_URL/budgets?userId=$USER_ID"
Assert-Success $budgets "list budgets"

Step "Step 8: Negative case - finance_interest with saving account should fail"
try {
  $badBudget = Invoke-RestMethod -Method Post -Uri "$BASE_URL/budgets" -ContentType "application/json" -Body (@{
    userId = $USER_ID
    periodType = "finance_interest"
    budgetMonth = "2026-03"
    accountId = $SAVING_ACCOUNT_ID
    plannedAnnualRate = 0.05
    plannedPrincipalAmount = 5000
  } | ConvertTo-Json)
  Assert-Fail $badBudget "invalid finance_interest account kind"
} catch {
  Write-Host "Expected failure captured: $($_.Exception.Message)" -ForegroundColor Yellow
}

Step "Step 9: Create record"
$record = Invoke-RestMethod -Method Post -Uri "$BASE_URL/records" -ContentType "application/json" -Body (@{
  userId = $USER_ID
  recordType = "expense"
  amount = 38.5
  recordDate = "2026-03-26"
  accountId = $SAVING_ACCOUNT_ID
  categorySnapshot = "Food"
  note = "Lunch"
} | ConvertTo-Json)
Assert-Success $record "create record"
$RECORD_ID = [int]$record.data.id
Write-Host "RECORD_ID=$RECORD_ID"

Step "Step 10: List records"
$records = Invoke-RestMethod -Method Get -Uri "$BASE_URL/records?userId=$USER_ID&recordMonth=2026-03"
Assert-Success $records "list records"

Step "Step 11: Update record"
$recordUpdated = Invoke-RestMethod -Method Put -Uri "$BASE_URL/records/$RECORD_ID" -ContentType "application/json" -Body (@{
  userId = $USER_ID
  recordType = "expense"
  amount = 40
  recordDate = "2026-03-26"
  accountId = $SAVING_ACCOUNT_ID
  categorySnapshot = "Food"
  note = "Lunch fixed"
} | ConvertTo-Json)
Assert-Success $recordUpdated "update record"

Step "Step 12: Create family group"
$group = Invoke-RestMethod -Method Post -Uri "$BASE_URL/family-groups" -ContentType "application/json" -Body (@{
  ownerUserId = $USER_ID
  name = "My Family"
} | ConvertTo-Json)
Assert-Success $group "create family group"
$GROUP_ID = [int]$group.data.id
Write-Host "GROUP_ID=$GROUP_ID"

Step "Step 13: List family groups"
$groups = Invoke-RestMethod -Method Get -Uri "$BASE_URL/family-groups?ownerUserId=$USER_ID"
Assert-Success $groups "list family groups"

Step "Step 14: Login user2 and add member"
$u2 = Invoke-RestMethod -Method Post -Uri "$BASE_URL/auth/login" -ContentType "application/json" -Body '{"wechatOpenid":"wx_test_u2","nickname":"User2"}'
Assert-Success $u2 "auth.login u2"
$USER2_ID = [int]$u2.data.id
Write-Host "USER2_ID=$USER2_ID"

$member = Invoke-RestMethod -Method Post -Uri "$BASE_URL/family-groups/$GROUP_ID/members" -ContentType "application/json" -Body (@{
  userId = $USER2_ID
  role = "member"
  status = "active"
} | ConvertTo-Json)
Assert-Success $member "add family member"

Step "Step 15: List family members"
$members = Invoke-RestMethod -Method Get -Uri "$BASE_URL/family-groups/$GROUP_ID/members"
Assert-Success $members "list family members"

Step "Step 16: 404 negative check"
try {
  $notFound = Invoke-RestMethod -Method Get -Uri "$BASE_URL/not-exists"
  Assert-Fail $notFound "404 check"
} catch {
  Write-Host "Expected 404 captured: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "All 16 steps finished." -ForegroundColor Green

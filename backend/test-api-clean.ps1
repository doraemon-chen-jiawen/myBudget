$ErrorActionPreference = "Stop"

$BASE_URL = "http://localhost:3000/api"

function Step($msg) {
  Write-Host ""
  Write-Host "==== $msg ====" -ForegroundColor Cyan
}

function Try-Invoke([scriptblock]$block, [string]$label) {
  try {
    & $block
  } catch {
    Write-Host "[WARN] $label failed: $($_.Exception.Message)" -ForegroundColor Yellow
    return $null
  }
}

function Login-User([string]$openid, [string]$nickname) {
  $resp = Invoke-RestMethod -Method Post -Uri "$BASE_URL/auth/login" -ContentType "application/json" -Body (@{
    wechatOpenid = $openid
    nickname = $nickname
  } | ConvertTo-Json)

  if (-not $resp.success) {
    throw "Login failed for ${openid}: $($resp | ConvertTo-Json -Depth 10)"
  }
  return [int]$resp.data.id
}

function Delete-RecordList([int]$userId) {
  $resp = Invoke-RestMethod -Method Get -Uri "$BASE_URL/records?userId=$userId"
  if (-not $resp.success) { return 0 }
  $count = 0
  foreach ($item in $resp.data) {
    Try-Invoke {
      $null = Invoke-RestMethod -Method Delete -Uri "$BASE_URL/records/$($item.id)" -ContentType "application/json" -Body (@{ userId = $userId } | ConvertTo-Json)
      $script:deletedRecords++
    } "delete record id=$($item.id)"
    $count++
  }
  return $count
}

function Delete-BudgetList([int]$userId) {
  $resp = Invoke-RestMethod -Method Get -Uri "$BASE_URL/budgets?userId=$userId"
  if (-not $resp.success) { return 0 }
  $count = 0
  foreach ($item in $resp.data) {
    Try-Invoke {
      $null = Invoke-RestMethod -Method Delete -Uri "$BASE_URL/budgets/$($item.id)" -ContentType "application/json" -Body (@{ userId = $userId } | ConvertTo-Json)
      $script:deletedBudgets++
    } "delete budget id=$($item.id)"
    $count++
  }
  return $count
}

function Delete-AccountsByPath([int]$userId, [string]$pathName, [ref]$counter) {
  $resp = Invoke-RestMethod -Method Get -Uri "$BASE_URL/$($pathName)?userId=$userId"
  if (-not $resp.success) { return 0 }
  $count = 0
  foreach ($item in $resp.data) {
    Try-Invoke {
      $null = Invoke-RestMethod -Method Delete -Uri "$BASE_URL/$($pathName)/$($item.id)" -ContentType "application/json" -Body (@{ userId = $userId } | ConvertTo-Json)
      $counter.Value++
    } "delete $pathName id=$($item.id)"
    $count++
  }
  return $count
}

function Delete-FamilyGroups([int]$ownerUserId) {
  $resp = Invoke-RestMethod -Method Get -Uri "$BASE_URL/family-groups?ownerUserId=$ownerUserId"
  if (-not $resp.success) { return 0 }
  $count = 0
  foreach ($item in $resp.data) {
    Try-Invoke {
      $null = Invoke-RestMethod -Method Delete -Uri "$BASE_URL/family-groups/$($item.id)" -ContentType "application/json" -Body (@{ ownerUserId = $ownerUserId } | ConvertTo-Json)
      $script:deletedGroups++
    } "delete family-group id=$($item.id)"
    $count++
  }
  return $count
}

$deletedRecords = 0
$deletedBudgets = 0
$deletedSavingAccounts = 0
$deletedFinanceAccounts = 0
$deletedGroups = 0

Step "Login test users"
$USER1_ID = Login-User "wx_test_u1" "User1"
$USER2_ID = Login-User "wx_test_u2" "User2"
Write-Host "USER1_ID=$USER1_ID, USER2_ID=$USER2_ID"

Step "Delete records"
[void](Delete-RecordList $USER1_ID)

Step "Delete budgets"
[void](Delete-BudgetList $USER1_ID)

Step "Delete saving accounts"
[void](Delete-AccountsByPath $USER1_ID "bank-accounts" ([ref]$deletedSavingAccounts))

Step "Delete finance accounts"
[void](Delete-AccountsByPath $USER1_ID "finance-accounts" ([ref]$deletedFinanceAccounts))

Step "Delete family groups (cascade members)"
[void](Delete-FamilyGroups $USER1_ID)

Write-Host ""
Write-Host "Cleanup finished." -ForegroundColor Green
Write-Host ("deletedRecords={0}, deletedBudgets={1}, deletedSavingAccounts={2}, deletedFinanceAccounts={3}, deletedGroups={4}" -f `
  $deletedRecords, $deletedBudgets, $deletedSavingAccounts, $deletedFinanceAccounts, $deletedGroups)
Write-Host "Note: users are kept (no delete-user API currently)." -ForegroundColor DarkGray


$files = Get-ChildItem "src\pages\academic\*.tsx"
foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw
    $c = $c -replace "from '\.\./lib/", "from '../../lib/"
    $c = $c -replace "from '\.\./components/", "from '../../components/"
    Set-Content -Path $f.FullName -Value $c -NoNewline
    Write-Host "Fixed: $($f.Name)"
}

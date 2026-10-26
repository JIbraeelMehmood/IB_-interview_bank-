# Interview Box - tiny local web server (only reachable from this computer)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8765
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try { $listener.Start() } catch {
  Write-Host "Port $port is busy - Interview Box may already be running. Opening it..."
  Start-Process "http://localhost:$port/interview-box.html"; Start-Sleep 3; exit
}
Start-Process "http://localhost:$port/interview-box.html"
Write-Host "Interview Box is running at http://localhost:$port/interview-box.html"
Write-Host "Keep this window open while you use the app. Close it to stop."
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript'; '.json'='application/json'; '.css'='text/css'; '.png'='image/png'; '.svg'='image/svg+xml'; '.mp3'='audio/mpeg'; '.zip'='application/zip' }
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($rel -eq '') { $rel = 'interview-box.html' }
    $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $full -PathType Leaf)) {
      $ctx.Response.StatusCode = 404; $b = [Text.Encoding]::UTF8.GetBytes('Not found')
    } else {
      $b = [IO.File]::ReadAllBytes($full)
      $ext = [IO.Path]::GetExtension($full).ToLower()
      $ctx.Response.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' })
      $ctx.Response.Headers.Add('Cache-Control', 'no-store')
    }
    $ctx.Response.OutputStream.Write($b, 0, $b.Length)
  } catch { } finally { $ctx.Response.Close() }
}

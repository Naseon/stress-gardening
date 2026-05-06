$port = 3001
$root = "C:\Users\nsy52\Documents\Codex\2026-04-22-ai-3d"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$port"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.LocalPath)
        if ($requestPath -eq "/") { $requestPath = "/index.html" }

        $relativePath = $requestPath.TrimStart("/") -replace "/", [System.IO.Path]::DirectorySeparatorChar
        $file = Join-Path $root $relativePath
        $resolvedRoot = [System.IO.Path]::GetFullPath($root)
        $resolvedFile = [System.IO.Path]::GetFullPath($file)
        $res = $context.Response
        $res.KeepAlive = $false
        $success = $false

        if (-not $resolvedFile.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            $res.StatusCode = 403
            $success = $true
        } elseif (Test-Path $resolvedFile -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($resolvedFile).ToLowerInvariant()
            $res.ContentType = switch ($ext) {
                ".html"  { "text/html; charset=utf-8" }
                ".css"   { "text/css; charset=utf-8" }
                ".js"    { "application/javascript; charset=utf-8" }
                ".json"  { "application/json; charset=utf-8" }
                ".png"   { "image/png" }
                ".jpg"   { "image/jpeg" }
                ".jpeg"  { "image/jpeg" }
                ".webp"  { "image/webp" }
                ".svg"   { "image/svg+xml" }
                ".mp4"   { "video/mp4" }
                ".woff2" { "font/woff2" }
                ".ico"   { "image/x-icon" }
                default  { "application/octet-stream" }
            }
            try {
                $bytes = [System.IO.File]::ReadAllBytes($resolvedFile)
                # HEAD requests: return headers only, no body
                if ($context.Request.HttpMethod -eq "HEAD") {
                    $res.ContentLength64 = [long]$bytes.Length
                    $success = $true
                } else {
                    # Use chunked transfer to avoid ContentLength64 mismatch
                    $res.SendChunked = $true
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)
                    $res.OutputStream.Flush()
                    $success = $true
                }
            } catch {
                Write-Host "Serve error [$requestPath]: $_"
            }
        } else {
            $res.StatusCode = 404
            $success = $true
        }

        if ($success) {
            try { $res.Close() } catch { }
        } else {
            try { $res.Abort() } catch { }
        }
    }
}
finally {
    if ($listener.IsListening) { $listener.Stop() }
    $listener.Close()
}

Add-Type -AssemblyName System.Drawing

function Save-Icon {
  param(
    [int]$Size,
    [string]$Path,
    [bool]$Maskable
  )

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(255, 18, 18, 26))

  $padding = if ($Maskable) { [int]($Size * 0.2) } else { [int]($Size * 0.12) }
  $diameter = $Size - (2 * $padding)
  $rect = New-Object System.Drawing.Rectangle $padding, $padding, $diameter, $diameter
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    ([System.Drawing.Color]::FromArgb(255, 109, 93, 252)),
    ([System.Drawing.Color]::FromArgb(255, 34, 211, 238)),
    135
  )
  $g.FillEllipse($brush, $rect)

  $fontSize = [Math]::Max(12, [int]($Size * 0.28))
  $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold)
  $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textRect = New-Object System.Drawing.RectangleF 0, 0, $Size, $Size
  $g.DrawString("P", $font, $textBrush, $textRect, $sf)

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
Save-Icon -Size 192 -Path (Join-Path $root "public/icon-192.png") -Maskable $false
Save-Icon -Size 512 -Path (Join-Path $root "public/icon-512.png") -Maskable $false
Save-Icon -Size 512 -Path (Join-Path $root "public/icon-512-maskable.png") -Maskable $true

Write-Host "PWA icons created in public/"

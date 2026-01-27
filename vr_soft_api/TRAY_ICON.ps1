try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
} catch {
    Write-Host "Erro ao carregar assemblies."
    Exit
}

# Caminhos
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$PythonPath = Join-Path $ScriptPath "python.exe"

# Configurar NotifyIcon
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Text = "VR Soft API (Rodando)"

try {
    # Tenta usar o icone do Python, se falhar usa icone padrao de sistema
    if (Test-Path $PythonPath) {
        $notify.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($PythonPath)
    } else {
         $notify.Icon = [System.Drawing.SystemIcons]::Application
    }
} catch {
    $notify.Icon = [System.Drawing.SystemIcons]::Application
}

$notify.Visible = $True

# Menu de Contexto
$menu = New-Object System.Windows.Forms.ContextMenu

# Item: Abrir Navegador
$itemOpen = $menu.MenuItems.Add("Abrir Link (Ngrok)")
$itemOpen.add_Click({ 
    [System.Diagnostics.Process]::Start("https://torri-floaty-lauryn.ngrok-free.dev") 
})

$itemLocal = $menu.MenuItems.Add("Abrir Teste Local")
$itemLocal.add_Click({ 
    [System.Diagnostics.Process]::Start("http://localhost:5000/produto/7575") 
})

$menu.MenuItems.Add("-")

# Item: Parar e Sair
$itemExit = $menu.MenuItems.Add("Parar API e Sair")
$itemExit.add_Click({ 
    $notify.Visible = $False
    # Matar processos
    Stop-Process -Name "python" -ErrorAction SilentlyContinue
    Stop-Process -Name "ngrok" -ErrorAction SilentlyContinue
    $notify.Dispose()
    [System.Windows.Forms.Application]::Exit()
})

$notify.ContextMenu = $menu

# Iniciar Loop da UI
[System.Windows.Forms.Application]::Run()

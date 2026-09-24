<#
.SYNOPSIS
    Gera o pacote de entrega OASIS_entrega.zip a partir dos arquivos versionados.

.DESCRIPTION
    Monta o zip com "git archive" (respeitando .gitattributes para os finais de
    linha dos scripts), exclui o material interno da equipe, inclui o .env de
    demonstracao (copia de .env.demonstracao) e confere o conteudo gerado.

    Por padrao usa o commit atual (HEAD) e exige a arvore de trabalho limpa.
    Com -IncluirAlteracoesLocais, usa os arquivos versionados no estado atual do
    disco, incluindo alteracoes e arquivos novos ainda nao commitados (respeitando
    o .gitignore), sem alterar o indice nem criar commits.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File gerar_entrega.ps1
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File gerar_entrega.ps1 -IncluirAlteracoesLocais
#>
param(
    [switch]$IncluirAlteracoesLocais,
    [string]$Saida = 'OASIS_entrega.zip'
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Falhar([string]$mensagem) {
    Write-Host "[ERRO] $mensagem" -ForegroundColor Red
    exit 1
}

# Caminhos que permanecem apenas no repositorio
$exclusoes = @(
    '.agents',
    'CLAUDE.md',
    'gerar_entrega.ps1',
    'Documentos/AGENTS.md',
    'Documentos/relatorios_commits',
    'Documentos/implementacoes',
    'Documentos/diferencas_e_impactos_docker.md',
    'Documentos/diagramas/sql_consolidado'
)

# Arquivos que obrigatoriamente devem estar no pacote
$obrigatorios = @(
    'OASIS/.env',
    'OASIS/.env.demonstracao',
    'OASIS/README.md',
    'OASIS/LICENSE',
    'OASIS/iniciar.bat',
    'OASIS/iniciar.sh',
    'OASIS/docker-compose.yml',
    'OASIS/banco/oasis_banco_completo.sql',
    'OASIS/backend/Dockerfile',
    'OASIS/frontend/Dockerfile',
    'OASIS/Documentos/referencias_do_Projeto/OASIS_Projeto.pdf'
)

# Padroes que nunca podem aparecer no pacote
$proibido = '^OASIS/(\.git/|\.agents/|CLAUDE\.md$|gerar_entrega\.ps1$|Documentos/AGENTS\.md$|Documentos/relatorios_commits/|Documentos/implementacoes/|Documentos/diferencas_e_impactos_docker\.md$|Documentos/diagramas/sql_consolidado/|backend/\.env$|frontend/\.env$)|/node_modules/|/dist/|/uploads/'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Falhar 'Git nao encontrado no PATH.' }
if (-not (Test-Path -LiteralPath '.env.demonstracao')) { Falhar 'Arquivo .env.demonstracao nao encontrado.' }

# --- 1. Define a arvore a ser empacotada ---
$indiceTemporario = $null
if ($IncluirAlteracoesLocais) {
    $indiceTemporario = Join-Path ([IO.Path]::GetTempPath()) ("oasis_indice_" + [Guid]::NewGuid().ToString('N'))
    $env:GIT_INDEX_FILE = $indiceTemporario
    try {
        git read-tree HEAD
        if ($LASTEXITCODE -ne 0) { Falhar 'git read-tree falhou.' }
        git -c core.safecrlf=false add -A
        if ($LASTEXITCODE -ne 0) { Falhar 'git add (indice temporario) falhou.' }
        $arvore = (git write-tree).Trim()
        if ($LASTEXITCODE -ne 0) { Falhar 'git write-tree falhou.' }
    } finally {
        Remove-Item Env:\GIT_INDEX_FILE -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $indiceTemporario -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Origem: arquivos versionados no estado atual do disco (arvore $($arvore.Substring(0,7)))."
} else {
    $pendentes = git status --porcelain
    if ($pendentes) {
        Write-Host $($pendentes -join "`n")
        Falhar 'Ha alteracoes nao commitadas. Faca o commit ou use -IncluirAlteracoesLocais.'
    }
    $arvore = 'HEAD'
    Write-Host "Origem: commit $((git rev-parse --short HEAD).Trim()) na branch $((git rev-parse --abbrev-ref HEAD).Trim())."
}

# --- 2. Prepara o .env de demonstracao ---
$pastaTemporaria = Join-Path ([IO.Path]::GetTempPath()) ("oasis_entrega_" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $pastaTemporaria | Out-Null
Copy-Item -LiteralPath '.env.demonstracao' -Destination (Join-Path $pastaTemporaria '.env')

# --- 3. Gera o zip ---
$caminhoSaida = Join-Path $PSScriptRoot $Saida
if (Test-Path -LiteralPath $caminhoSaida) { Remove-Item -LiteralPath $caminhoSaida -Force }

$argumentos = @(
    '-c', 'core.autocrlf=false',
    'archive', '--format=zip', '--prefix=OASIS/',
    "--add-file=$(Join-Path $pastaTemporaria '.env')",
    '-o', $caminhoSaida,
    $arvore, '--', '.'
) + ($exclusoes | ForEach-Object { ":(exclude)$_" })

try {
    & git @argumentos
    if ($LASTEXITCODE -ne 0) { Falhar 'git archive falhou.' }
} finally {
    Remove-Item -LiteralPath $pastaTemporaria -Recurse -Force -ErrorAction SilentlyContinue
}

# --- 4. Confere o conteudo ---
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($caminhoSaida)
try {
    $entradas = $zip.Entries | Where-Object { -not $_.FullName.EndsWith('/') }
    $nomes = $entradas | ForEach-Object { $_.FullName }

    $faltando = $obrigatorios | Where-Object { $nomes -notcontains $_ }
    if ($faltando) { Falhar ("Arquivos obrigatorios ausentes: " + ($faltando -join ', ')) }

    $indevidos = $nomes | Where-Object { $_ -match $proibido }
    if ($indevidos) { Falhar ("Arquivos que nao deveriam estar no pacote: " + ($indevidos -join ', ')) }

    # O PDF do pacote deve ser identico ao PDF atual do disco
    $pdfZip = $entradas | Where-Object { $_.FullName -eq 'OASIS/Documentos/referencias_do_Projeto/OASIS_Projeto.pdf' }
    $pdfDisco = Get-Item -LiteralPath 'Documentos/referencias_do_Projeto/OASIS_Projeto.pdf'
    if ($pdfZip.Length -ne $pdfDisco.Length) {
        Falhar "PDF do pacote ($($pdfZip.Length) bytes) difere do PDF em disco ($($pdfDisco.Length) bytes). Faca o commit do PDF final ou use -IncluirAlteracoesLocais."
    }

    # Finais de linha dos scripts de inicializacao
    function LerEntrada($nome) {
        $e = $entradas | Where-Object { $_.FullName -eq $nome }
        $leitor = New-Object IO.StreamReader($e.Open())
        try { return $leitor.ReadToEnd() } finally { $leitor.Dispose() }
    }
    if ((LerEntrada 'OASIS/iniciar.sh').Contains("`r")) { Falhar 'iniciar.sh contem CRLF; o bash exige LF.' }
    $bat = LerEntrada 'OASIS/iniciar.bat'
    if (($bat -split "`n").Count -ne ($bat -split "`r`n").Count) { Falhar 'iniciar.bat nao esta inteiramente em CRLF.' }

    $totalDescompactado = ($entradas | Measure-Object -Property Length -Sum).Sum
    $tamanhoZip = (Get-Item -LiteralPath $caminhoSaida).Length

    Write-Host ''
    Write-Host "[OK] Pacote gerado: $caminhoSaida" -ForegroundColor Green
    Write-Host ("     Arquivos: {0}   Tamanho do zip: {1:N2} MB   Descompactado: {2:N2} MB" -f $nomes.Count, ($tamanhoZip / 1MB), ($totalDescompactado / 1MB))
    Write-Host '     Conferidos: arquivos obrigatorios, exclusoes, PDF final e finais de linha dos scripts.'
} finally {
    $zip.Dispose()
}

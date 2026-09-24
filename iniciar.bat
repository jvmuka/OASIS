@echo off
rem ==================================================================
rem  OASIS - inicializacao da demonstracao via Docker (Windows)
rem  Uso: extraia o zip e de um duplo clique neste arquivo.
rem ==================================================================
setlocal EnableExtensions
cd /d "%~dp0"
title OASIS - Inicializacao

echo.
echo ==================================================================
echo  OASIS - Sistema de Reservas e Controle de Acesso
echo ==================================================================
echo.

rem --- 1. Arquivos do projeto presentes (zip extraido) ---
if not exist "docker-compose.yml" (
    echo [ERRO] docker-compose.yml nao encontrado ao lado deste script.
    echo        Extraia o arquivo zip por completo ^(botao direito ^> Extrair Tudo^)
    echo        e execute o iniciar.bat a partir da pasta extraida.
    goto :falha
)

rem --- 2. Docker instalado e em execucao ---
where docker >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Docker nao encontrado. Instale o Docker Desktop:
    echo        https://www.docker.com/products/docker-desktop/
    goto :falha
)
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERRO] O Docker Desktop nao esta em execucao.
    echo        Abra o Docker Desktop, aguarde a mensagem "Engine running"
    echo        e execute este script novamente.
    goto :falha
)
docker compose version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] O comando "docker compose" nao esta disponivel.
    echo        Atualize o Docker Desktop para uma versao recente.
    goto :falha
)
echo [OK] Docker em execucao.

rem --- 3. Arquivo .env de demonstracao ---
if not exist ".env" (
    if exist ".env.demonstracao" (
        copy /y ".env.demonstracao" ".env" >nul
        echo [OK] Arquivo .env recriado a partir de .env.demonstracao.
    ) else (
        echo [ERRO] Arquivos .env e .env.demonstracao ausentes.
        goto :falha
    )
) else (
    echo [OK] Arquivo .env encontrado.
)

rem --- 4. Portas livres (somente se o OASIS ainda nao estiver rodando) ---
set "OASIS_RODANDO="
for /f %%i in ('docker ps -q --filter "name=oasis-" 2^>nul') do set "OASIS_RODANDO=1"
if not defined OASIS_RODANDO (
    set "PORTA_OCUPADA="
    for %%p in (5173 3000 5433) do (
        netstat -ano | findstr /R /C:":%%p .*LISTENING" >nul && (
            echo [ERRO] A porta %%p ja esta em uso por outro programa.
            set "PORTA_OCUPADA=1"
        )
    )
)
if defined PORTA_OCUPADA (
    echo        Encerre o programa que usa a porta e execute novamente.
    goto :falha
)

rem --- 5. Subida dos conteineres ---
echo.
echo Construindo e iniciando os conteineres. Na primeira execucao isso
echo pode levar alguns minutos ^(download de imagens e dependencias^).
echo.
docker compose up -d --build
if errorlevel 1 (
    echo [ERRO] Falha ao iniciar os conteineres. Veja as mensagens acima.
    goto :falha
)

rem --- 6. Espera o backend responder pelo frontend (401 = API no ar) ---
echo.
<nul set /p "=Aguardando o sistema ficar disponivel"
set /a TENTATIVAS=0
:espera
set "CODIGO="
for /f %%c in ('curl -s -o NUL -w "%%{http_code}" http://localhost:5173/api/areas 2^>nul') do set "CODIGO=%%c"
if "%CODIGO%"=="401" goto :pronto
set /a TENTATIVAS+=1
if %TENTATIVAS% GEQ 72 goto :tempo_esgotado
<nul set /p "=."
ping -n 6 127.0.0.1 >nul
goto :espera

:pronto
echo.
echo.
echo ==================================================================
echo  OASIS disponivel em:  http://localhost:5173
echo ==================================================================
echo.
echo  Senha de todos os usuarios:  Teste@2026
echo  ^(ou use os botoes de "Acesso Rapido" na tela de login^)
echo.
echo  Morador .......... carlos.silva@teste.com
echo  Sindica .......... ana.souza@teste.com
echo  Porteiro ......... roberto.lima@teste.com
echo.
echo  Outros moradores:  maria.santos@teste.com, joao.oliveira@teste.com,
echo                     helena.braga@teste.com
echo.
echo  Para encerrar:     docker compose down
echo  Para zerar dados:  docker compose down -v
echo ==================================================================
echo.
start "" "http://localhost:5173"
pause
exit /b 0

:tempo_esgotado
echo.
echo [ERRO] O sistema nao respondeu em 6 minutos. Ultimas linhas do backend:
echo.
docker compose logs --tail 40 backend
goto :falha

:falha
echo.
echo Consulte a secao "Solucao de problemas" do README.md.
echo.
pause
exit /b 1

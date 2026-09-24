#!/usr/bin/env bash
# ==================================================================
#  OASIS - inicializacao da demonstracao via Docker (Linux / macOS)
#  Uso: bash iniciar.sh
# ==================================================================
set -u
cd "$(dirname "$0")" || exit 1

falha() {
    echo
    echo "Consulte a secao \"Solucao de problemas\" do README.md."
    exit 1
}

echo
echo "=================================================================="
echo " OASIS - Sistema de Reservas e Controle de Acesso"
echo "=================================================================="
echo

# --- 1. Arquivos do projeto presentes ---
if [ ! -f docker-compose.yml ]; then
    echo "[ERRO] docker-compose.yml nao encontrado ao lado deste script."
    echo "       Extraia o zip por completo e execute a partir da pasta extraida."
    falha
fi

# --- 2. Docker instalado e em execucao ---
if ! command -v docker >/dev/null 2>&1; then
    echo "[ERRO] Docker nao encontrado. Instale o Docker Desktop ou Docker Engine."
    falha
fi
if ! docker info >/dev/null 2>&1; then
    echo "[ERRO] O Docker nao esta em execucao (ou o usuario nao tem permissao)."
    echo "       Inicie o Docker e execute este script novamente."
    falha
fi
if ! docker compose version >/dev/null 2>&1; then
    echo "[ERRO] O comando \"docker compose\" (Compose v2) nao esta disponivel."
    falha
fi
echo "[OK] Docker em execucao."

# --- 3. Arquivo .env de demonstracao ---
if [ ! -f .env ]; then
    if [ -f .env.demonstracao ]; then
        cp .env.demonstracao .env
        echo "[OK] Arquivo .env recriado a partir de .env.demonstracao."
    else
        echo "[ERRO] Arquivos .env e .env.demonstracao ausentes."
        falha
    fi
else
    echo "[OK] Arquivo .env encontrado."
fi

# --- 4. Portas livres (somente se o OASIS ainda nao estiver rodando) ---
if [ -z "$(docker ps -q --filter name=oasis- 2>/dev/null)" ]; then
    ocupada=0
    for porta in 5173 3000 5433; do
        if (exec 3<>"/dev/tcp/127.0.0.1/$porta") 2>/dev/null; then
            echo "[ERRO] A porta $porta ja esta em uso por outro programa."
            ocupada=1
        fi
    done
    [ "$ocupada" -eq 1 ] && falha
fi

# --- 5. Subida dos conteineres ---
echo
echo "Construindo e iniciando os conteineres. Na primeira execucao isso"
echo "pode levar alguns minutos (download de imagens e dependencias)."
echo
if ! docker compose up -d --build; then
    echo "[ERRO] Falha ao iniciar os conteineres. Veja as mensagens acima."
    falha
fi

# --- 6. Espera o backend responder pelo frontend (401 = API no ar) ---
echo
printf "Aguardando o sistema ficar disponivel"
tentativas=0
until [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/api/areas 2>/dev/null)" = "401" ]; do
    tentativas=$((tentativas + 1))
    if [ "$tentativas" -ge 72 ]; then
        echo
        echo "[ERRO] O sistema nao respondeu em 6 minutos. Ultimas linhas do backend:"
        docker compose logs --tail 40 backend
        falha
    fi
    printf "."
    sleep 5
done

echo
echo
echo "=================================================================="
echo " OASIS disponivel em:  http://localhost:5173"
echo "=================================================================="
echo
echo " Senha de todos os usuarios:  Teste@2026"
echo " (ou use os botoes de \"Acesso Rapido\" na tela de login)"
echo
echo " Morador .......... carlos.silva@teste.com"
echo " Sindica .......... ana.souza@teste.com"
echo " Porteiro ......... roberto.lima@teste.com"
echo
echo " Outros moradores:  maria.santos@teste.com, joao.oliveira@teste.com,"
echo "                    helena.braga@teste.com"
echo
echo " Para encerrar:     docker compose down"
echo " Para zerar dados:  docker compose down -v"
echo "=================================================================="
echo

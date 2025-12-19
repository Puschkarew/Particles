#!/bin/bash

# Скрипт для запуска локального HTTP сервера
# Использование: ./start-server.sh [port]

PORT=${1:-5555}

echo "Запуск HTTP сервера на порту $PORT..."
echo "Откройте в браузере: http://localhost:$PORT/gaussian-splatting_reveal.html"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo ""

# Проверяем наличие Python 3
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
# Проверяем наличие Python 2
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
else
    echo "Ошибка: Python не найден. Установите Python или используйте другой HTTP сервер."
    echo "Альтернативы:"
    echo "  - npx http-server -p $PORT"
    echo "  - php -S localhost:$PORT"
    exit 1
fi













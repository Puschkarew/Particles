# Gaussian Splatting Reveal - Standalone Export

Этот проект содержит все необходимые файлы для работы страницы `gaussian-splatting_reveal.html` в standalone режиме.

## Структура проекта

```
gaussian-splatting-reveal-export/
├── gaussian-splatting_reveal.html    # Главный HTML файл
├── main.css                          # Стили
├── polyfill.js                       # Полифиллы
├── playcanvas.mjs                    # PlayCanvas движок
├── loader.mjs                        # Загрузчик примера
├── utils.mjs                         # Утилиты
├── observer.mjs                      # Observer для управления состоянием
├── files.mjs                         # Файловая система
├── gaussian-splatting_reveal.example.mjs  # Основной код примера
├── gaussian-splatting_reveal.controls.mjs # UI контролы
├── modules/
│   └── fflate/                       # Модуль для работы с архивами
│       └── esm/
│           └── browser.js
└── static/
    ├── assets/
    │   └── splats/                   # 3D модели (PLY файлы)
    │       ├── Future.ply
    │       ├── Ceramic.ply
    │       └── Room.ply
    └── scripts/
        ├── camera/
        │   └── orbit-camera.js       # Скрипт камеры
        └── esm/
            └── gsplat/               # Эффекты reveal
                ├── reveal-radial.mjs
                ├── reveal-rain.mjs
                ├── reveal-grid-eruption.mjs
                └── shader-effect-box.mjs
```

## Запуск

### Вариант 1: Локальный сервер (рекомендуется)

Из-за CORS ограничений браузера, файлы должны быть открыты через HTTP сервер, а не напрямую через `file://`.

#### Использование Python:

```bash
# Python 3
python3 -m http.server 5555

# Python 2
python -m SimpleHTTPServer 5555
```

Затем откройте в браузере:
```
http://localhost:5555/gaussian-splatting_reveal.html
```

#### Использование Node.js (http-server):

```bash
npx http-server -p 5555
```

#### Использование PHP:

```bash
php -S localhost:5555
```

### Вариант 2: Live Server (VS Code)

Если используете VS Code, установите расширение "Live Server" и откройте `gaussian-splatting_reveal.html` через контекстное меню "Open with Live Server".

## Функциональность

Проект включает:

- **3 сцены**: Future, Ceramic, Room
- **3 эффекта reveal**: Radial, Rain, Grid Eruption
- **Настройки**: Сохраняются в localStorage
- **Управление камерой**: Orbit camera с возможностью вращения и масштабирования
- **Плавные переходы**: Между сценами и эффектами

## Технические детали

- **PlayCanvas Engine**: Используется для рендеринга
- **Gaussian Splatting**: Технология для отображения 3D сцен
- **ES Modules**: Все модули используют ES6 import/export
- **Observer Pattern**: Для управления состоянием приложения

## Примечания

- Все пути настроены для работы из корня папки экспорта
- Настройки сохраняются в localStorage браузера
- Проект оптимизирован для работы в standalone режиме (без родительского iframe)













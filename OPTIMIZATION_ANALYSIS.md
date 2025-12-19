# Анализ проекта и план оптимизации

## 📊 Текущий размер проекта

### Общий размер engine/examples:
- **dist/**: 629M (собранный билд)
- **assets/**: 606M (исходные ресурсы)
- **node_modules/**: 254M (зависимости)
- **src/**: 8.6M (исходный код)
- **thumbnails/**: 2.0M (превью примеров)
- **Остальное**: ~1M

**ИТОГО: ~1.5 GB**

---

## 🔍 Анализ лишних файлов

### 1. Assets (606M) - МНОГО ЛИШНЕГО

#### ✅ Нужно для reveal (194M):
- `assets/splats/Future.ply` - 32M
- `assets/splats/Ceramic.ply` - 32M  
- `assets/splats/Room.ply` - 130M
- `assets/scripts/camera/orbit-camera.js` - несколько KB

#### ❌ Можно удалить (~412M):
- `assets/splats/biker.compressed.ply` - 2.4M
- `assets/splats/guitar.compressed.ply` - 1.4M
- `assets/splats/hotel-culpture.compressed.ply` - 16M
- `assets/splats/skull.compressed.ply` - 14M
- `assets/splats/optimized/` - дубликаты
- `assets/splats/flowers/` - не используется
- `assets/splats/playcanvas-logo/` - не используется
- `assets/models/` - 190M (все модели)
- `assets/hdri/` - 73M (HDRI окружения)
- `assets/textures/` - 7.5M (текстуры)
- `assets/animations/` - 6.4M (анимации)
- `assets/cubemaps/` - 1.4M
- `assets/video/` - 1.0M
- `assets/spine/` - 904K
- `assets/fonts/` - 220K
- `assets/json/` - 304K
- `assets/scripts/` - 332K (кроме camera/orbit-camera.js)
- `assets/sounds/` - 88K
- `assets/bundles/` - 88K
- `assets/templates/` - 60K
- `assets/cube-luts/` - 44K
- `assets/button/` - 36K

**Экономия: ~412M**

### 2. Thumbnails (2.0M) - МНОГО ЛИШНЕГО

#### ✅ Нужно для reveal:
- `thumbnails/gaussian-splatting_reveal_small.webp`
- `thumbnails/gaussian-splatting_reveal_large.webp`

#### ❌ Можно удалить:
- Все остальные 368 файлов превью других примеров

**Экономия: ~2.0M**

### 3. Source code (8.6M) - ИНТЕРФЕЙС БРАУЗЕРА

#### ✅ Нужно для reveal:
- `src/examples/gaussian-splatting/reveal.example.mjs`
- `src/examples/gaussian-splatting/reveal.controls.mjs`
- `src/lib/` - библиотеки (ammo, basis, draco, glslang, twgsl)
- `iframe/` - загрузчик примеров (нужен для standalone)

#### ❌ Можно удалить (интерфейс браузера примеров):
- `src/app/components/code-editor/` - редактор кода
- `src/app/components/Menu.mjs` - меню браузера
- `src/app/components/Sidebar.mjs` - боковая панель
- `src/app/components/MainLayout.mjs` - основной layout
- `src/app/components/DeviceSelector.mjs` - селектор устройства
- `src/app/monaco/` - Monaco Editor (редактор кода)
- `src/static/index.html` - главная страница браузера
- `src/static/styles.css` - стили браузера (частично)
- `src/static/playcanvas-logo.png` - логотип

**Экономия: ~76K (но это уберет весь интерфейс браузера)**

### 4. Dist (629M) - КОПИЯ ВСЕГО

#### ✅ Нужно для reveal:
- `dist/iframe/playcanvas.mjs` - движок
- `dist/iframe/observer.mjs` - observer
- `dist/iframe/utils.mjs` - утилиты
- `dist/iframe/gaussian-splatting_reveal.example.mjs`
- `dist/iframe/gaussian-splatting_reveal.controls.mjs`
- `dist/static/scripts/esm/gsplat/` - скрипты reveal
- `dist/static/scripts/camera/orbit-camera.js`
- `dist/static/assets/splats/Future.ply`
- `dist/static/assets/splats/Ceramic.ply`
- `dist/static/assets/splats/Room.ply`
- `dist/static/lib/` - библиотеки

#### ❌ Можно удалить:
- `dist/index.html` - главная страница браузера
- `dist/index.js` - бандл браузера примеров (628K)
- `dist/styles.css` - стили браузера
- `dist/thumbnails/` - все превью кроме reveal (2.0M)
- `dist/static/assets/` - все кроме splats (большая часть 615M)
- `dist/modules/monaco-editor/` - редактор кода (11M)

**Экономия: ~600M+**

### 5. Другие файлы

#### ❌ Можно удалить:
- `templates/` - шаблоны для других примеров
- `scripts/build-thumbnails.mjs` - генератор превью (не нужен)
- Часть `utils/` - утилиты для сборки других примеров

---

## 📋 План оптимизации

### Этап 1: Очистка Assets (Экономия: ~412M)

```bash
# Удалить неиспользуемые splats
rm -rf engine/examples/assets/splats/biker.compressed.ply
rm -rf engine/examples/assets/splats/guitar.compressed.ply
rm -rf engine/examples/assets/splats/hotel-culpture.compressed.ply
rm -rf engine/examples/assets/splats/skull.compressed.ply
rm -rf engine/examples/assets/splats/optimized/
rm -rf engine/examples/assets/splats/flowers/
rm -rf engine/examples/assets/splats/playcanvas-logo/

# Удалить все остальные assets
rm -rf engine/examples/assets/models/
rm -rf engine/examples/assets/hdri/
rm -rf engine/examples/assets/textures/
rm -rf engine/examples/assets/animations/
rm -rf engine/examples/assets/cubemaps/
rm -rf engine/examples/assets/video/
rm -rf engine/examples/assets/spine/
rm -rf engine/examples/assets/fonts/
rm -rf engine/examples/assets/json/
rm -rf engine/examples/assets/scripts/misc/
rm -rf engine/examples/assets/scripts/utils/
rm -rf engine/examples/assets/sounds/
rm -rf engine/examples/assets/bundles/
rm -rf engine/examples/assets/templates/
rm -rf engine/examples/assets/cube-luts/
rm -rf engine/examples/assets/button/
```

### Этап 2: Очистка Thumbnails (Экономия: ~2M)

```bash
# Оставить только reveal превью
cd engine/examples/thumbnails
find . -type f ! -name "*reveal*" -delete
```

### Этап 3: Очистка Source (Экономия: ~76K + интерфейс)

```bash
# Удалить интерфейс браузера примеров
rm -rf engine/examples/src/app/components/code-editor/
rm -rf engine/examples/src/app/components/Menu.mjs
rm -rf engine/examples/src/app/components/Sidebar.mjs
rm -rf engine/examples/src/app/components/MainLayout.mjs
rm -rf engine/examples/src/app/components/DeviceSelector.mjs
rm -rf engine/examples/src/app/monaco/
rm -rf engine/examples/src/static/index.html
rm -rf engine/examples/src/static/styles.css
rm -rf engine/examples/src/static/playcanvas-logo.png
```

### Этап 4: Очистка Dist после пересборки (Экономия: ~600M)

```bash
# После пересборки удалить лишнее из dist
rm -rf engine/examples/dist/index.html
rm -rf engine/examples/dist/index.js
rm -rf engine/examples/dist/styles.css
rm -rf engine/examples/dist/thumbnails/* ! -name "*reveal*"
rm -rf engine/examples/dist/modules/monaco-editor/
# Удалить все assets кроме splats
find engine/examples/dist/static/assets -type d ! -name "splats" -exec rm -rf {} +
find engine/examples/dist/static/assets/splats -type f ! -name "Future.ply" ! -name "Ceramic.ply" ! -name "Room.ply" -delete
```

### Этап 5: Очистка других файлов

```bash
# Удалить шаблоны
rm -rf engine/examples/templates/
# Удалить скрипт генерации превью (если не нужен)
# rm -rf engine/examples/scripts/build-thumbnails.mjs
```

---

## 🎯 Итоговая экономия

### После оптимизации:
- **Assets**: 606M → ~194M (**-412M**)
- **Thumbnails**: 2.0M → ~50K (**-2M**)
- **Dist**: 629M → ~200M (**-429M**)
- **Source**: 8.6M → ~8.5M (**-100K**)

### Общая экономия: **~843M (843 MB)**

### Новый размер проекта: **~650M вместо 1.5GB**

---

## ⚠️ Важные замечания

1. **Интерфейс браузера**: После удаления интерфейса браузера примеров, проект будет работать только через `reveal-standalone.html`

2. **Пересборка**: После очистки нужно пересобрать проект:
   ```bash
   cd engine/examples
   npm run clean
   npm run build
   ```

3. **Резервная копия**: Убедитесь, что есть резервная копия перед удалением

4. **Standalone версия**: После оптимизации основной способ использования - `reveal-standalone.html`

---

## ✅ Рекомендации

1. **Сначала очистить assets и thumbnails** - это даст максимальную экономию
2. **Потом пересобрать dist** - чтобы убрать лишнее из билда
3. **Интерфейс браузера** - удалять только если точно не нужен (можно оставить для разработки)
4. **Создать архив** перед оптимизацией















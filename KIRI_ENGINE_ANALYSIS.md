# Анализ анимации появления объекта на сайте KIRI Engine

## Обзор

На сайте [KIRI Engine](https://www.kiriengine.app/) используется **Three.js r175** для отображения 3D Gaussian Splatting моделей. Canvas элемент находится в секции:
```
div#__nuxt > main > section.ection .ection-fir.t > div.container > div.cont-r > div.model-view-wrap > div.model-container > canvas
```

## Технические детали

### Используемые технологии:
- **Three.js r175** - для 3D рендеринга
- **Nuxt.js** - как фреймворк
- **3D Gaussian Splatting** - формат отображения 3D сцен

### Структура загрузки (из Network запросов):

1. **Основной JS файл**: `DTonHwOk.js` - содержит логику рендеринга Gaussian Splatting
2. **Загружаемая модель**: `phoenicopteridae.splat` - пример 3D модели
3. **WASM модули**: `wasm-sort-worker-DxmcniBB.js` и `sort-simd-KTRj8aHX.wasm` - для оптимизации сортировки сплатов

### Логи из консоли показывают процесс:
```
load ply: 4.55 ms
decompress: 4.71 ms
create splat mesh: 3.78 ms
```

## Как работает анимация появления

Судя по структуре и использованию Gaussian Splatting, анимация появления скорее всего реализована одним из следующих способов:

### 1. **Радиальная волна появления** (наиболее вероятно)

Это похоже на технику, используемую в вашем проекте. Принцип работы:

- Объект появляется волной от центра наружу
- Используется uniform переменная для контроля прогресса (например, `uRevealProgress` 0.0 → 1.0)
- Для каждой точки (splat) вычисляется расстояние до центра
- Точки, находящиеся внутри радиуса волны, отображаются с полной непрозрачностью
- Точки вне радиуса скрыты или имеют прозрачность

### 2. **Шейдерная анимация**

Анимация реализована в шейдере (вершинном или фрагментном), что обеспечивает:
- Высокую производительность
- Плавные переходы
- Возможность анимации миллионов точек

### 3. **Управление из JavaScript**

JavaScript код управляет:
- Прогрессом анимации через uniform переменные
- Временем анимации
- Параметрами волны (радиус, скорость, толщина)

## Как найти код анимации на сайте

### Шаг 1: Откройте DevTools
1. Нажмите `F12` или `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
2. Перейдите на вкладку **Sources** или **Network**

### Шаг 2: Найдите JavaScript файлы
В Network вкладке отфильтруйте по "JS" и найдите:
- `DTonHwOk.js` - основной файл с логикой Gaussian Splatting
- Другие файлы с префиксом `_nuxt/`

### Шаг 3: Ищите ключевые слова в коде

Используя поиск в Sources (Ctrl+F / Cmd+F), ищите:
- `reveal`
- `animation`
- `progress`
- `uniform`
- `splat`
- `gaussian`
- `uTime` или `uProgress` (uniform переменные)

### Шаг 4: Изучите shader код

В коде ищите строки, содержащие:
- `/* glsl */` или `/* wgsl */` - начало шейдерного кода
- Функции типа `modifyColor`, `modifyPosition`, `modifyCovariance`
- Uniform переменные для контроля анимации

## Типичная структура кода анимации

```javascript
// JavaScript часть
const revealProgress = { value: 0.0 };

function animate() {
    requestAnimationFrame(animate);
    
    // Увеличиваем прогресс
    revealProgress.value += 0.01;
    if (revealProgress.value > 1.0) revealProgress.value = 1.0;
    
    // Передаем в шейдер
    material.uniforms.uRevealProgress.value = revealProgress.value;
    
    renderer.render(scene, camera);
}
```

```glsl
// Шейдерная часть (GLSL)
uniform float uRevealProgress; // 0.0 - 1.0
uniform vec3 uCenter; // Центр волны

void main() {
    vec3 center = position; // или center сплата
    
    // Вычисляем расстояние до центра волны
    float dist = length(center - uCenter);
    float maxDist = 10.0; // максимальный радиус
    float waveRadius = uRevealProgress * maxDist;
    
    // Определяем видимость на основе расстояния
    float visibility = 1.0 - smoothstep(waveRadius - 0.5, waveRadius + 0.5, dist);
    
    // Применяем к альфа-каналу
    gl_FragColor.a *= visibility;
}
```

## Сравнение с вашим проектом

Ваш проект использует PlayCanvas с похожей техникой радиальной волны. Основные отличия:

| Аспект | KIRI Engine (Three.js) | Ваш проект (PlayCanvas) |
|--------|----------------------|------------------------|
| Фреймворк | Three.js | PlayCanvas |
| Шейдеры | GLSL/WGSL | GLSL/WGSL (аналогично) |
| Принцип | Радиальная волна | Радиальная волна |
| Управление | Uniform переменные | Uniform переменные |

## Рекомендации для изучения

1. **Откройте DevTools** → Sources → найдите `DTonHwOk.js`
2. **Используйте форматирование кода** (кнопка `{}` в DevTools)
3. **Ищите функции** связанные с `reveal`, `animation`, `progress`
4. **Изучите uniform переменные** передаваемые в шейдеры
5. **Найдите шейдерный код** (обычно в строках с `/* glsl */`)

## Дополнительные ресурсы

- [Three.js Gaussian Splatting](https://github.com/polycam/gaussian-splatting-web)
- [Three.js Animation Documentation](https://threejs.org/docs/#manual/en/introduction/Animation-system)
- [GLSL Smoothstep Function](https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/smoothstep.xhtml)



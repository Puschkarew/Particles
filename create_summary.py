#!/usr/bin/env python3
"""
Создание резюме оптимизации
"""

import json
from pathlib import Path
from datetime import datetime

def load_json(filepath):
    """Загрузить JSON файл"""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return None

def format_size(mb):
    """Форматировать размер в читаемый формат"""
    if mb < 1:
        return f"{mb * 1024:.1f} KB"
    return f"{mb:.2f} MB"

def create_summary():
    """Создать резюме оптимизации"""
    
    base_dir = Path(__file__).parent
    
    # Загружаем данные
    perf_data = load_json(base_dir / "performance_analysis.json")
    opt_data = load_json(base_dir / "optimization_results.json")
    
    summary = {
        'timestamp': datetime.now().isoformat(),
        'title': 'Резюме оптимизации Gaussian Splatting',
        'analysis': {}
    }
    
    if perf_data:
        summary['analysis']['before'] = {
            'total_files': perf_data['summary']['total_files'],
            'total_size_mb': perf_data['summary']['total_size_mb'],
            'total_splats': perf_data['summary']['total_splats'],
            'average_splats_per_mb': perf_data['summary']['average_splats_per_mb']
        }
    
    if opt_data:
        total_original = sum(r['original_size_mb'] for r in opt_data.values())
        total_optimized = sum(r['optimized_size_mb'] for r in opt_data.values())
        total_estimated = sum(r.get('estimated_optimized_size_mb', r['optimized_size_mb']) for r in opt_data.values())
        
        summary['analysis']['after'] = {
            'total_size_mb': total_optimized,
            'estimated_optimized_size_mb': total_estimated,
            'savings_mb': total_original - total_optimized,
            'potential_savings_mb': total_original - total_estimated,
            'has_gsplat': any(r.get('has_gsplat', False) for r in opt_data.values())
        }
    
    # Создаем текстовое резюме
    print("=" * 70)
    print("📋 РЕЗЮМЕ ОПТИМИЗАЦИИ GAUSSIAN SPLATTING")
    print("=" * 70)
    print()
    
    if perf_data:
        print("📊 ДО ОПТИМИЗАЦИИ:")
        print("-" * 70)
        before = summary['analysis']['before']
        print(f"  • Количество файлов: {before['total_files']}")
        print(f"  • Общий размер: {format_size(before['total_size_mb'])}")
        print(f"  • Всего splat: {before['total_splats']:,}")
        print(f"  • Плотность: {before['average_splats_per_mb']:.0f} splat/MB")
        print()
    
    if opt_data:
        print("📊 ПОСЛЕ ОПТИМИЗАЦИИ:")
        print("-" * 70)
        after = summary['analysis']['after']
        
        if after['has_gsplat']:
            print("  ✓ Использован gsplat для оптимизации")
        else:
            print("  ⚠️  gsplat не доступен (использована базовая оптимизация)")
        
        print(f"  • Текущий размер: {format_size(after['total_size_mb'])}")
        
        if after['potential_savings_mb'] > 0:
            print(f"  • Потенциальная экономия: {format_size(after['potential_savings_mb'])}")
            savings_percent = (after['potential_savings_mb'] / summary['analysis']['before']['total_size_mb']) * 100
            print(f"  • Процент экономии: {savings_percent:.1f}%")
        print()
    
    # Рекомендации
    print("💡 РЕКОМЕНДАЦИИ:")
    print("-" * 70)
    
    if not (opt_data and any(r.get('has_gsplat', False) for r in opt_data.values())):
        print("  1. Установите gsplat для полной оптимизации:")
        print("     pip install gsplat")
        print("     (Требуется CUDA для GPU-ускорения)")
        print()
    
    print("  2. Используйте сжатые форматы (.sog) вместо .ply:")
    print("     - Меньший размер файлов")
    print("     - Быстрее загрузка")
    print()
    
    print("  3. Включите LOD streaming для больших сцен:")
    print("     entity.gsplat.unified = true")
    print()
    
    print("  4. Оптимизируйте количество splat:")
    print("     - Удалите невидимые splat")
    print("     - Используйте densification для важных областей")
    print()
    
    # Сохраняем резюме
    summary_path = base_dir / "optimization_summary.json"
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print("=" * 70)
    print(f"✅ Резюме сохранено в: {summary_path}")
    print("=" * 70)
    
    return summary

if __name__ == "__main__":
    create_summary()



















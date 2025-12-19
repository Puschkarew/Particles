#!/usr/bin/env python3
"""
Скрипт для измерения производительности загрузки и рендеринга splat файлов
"""

import os
import json
import time
from pathlib import Path
from datetime import datetime

def get_file_size(filepath):
    """Получить размер файла в MB"""
    return os.path.getsize(filepath) / (1024 * 1024)

def count_splats(ply_path):
    """Подсчитать количество splat в PLY файле"""
    count = 0
    with open(ply_path, 'rb') as f:
        for line in f:
            if b'element vertex' in line:
                count = int(line.split()[-1])
                break
    return count

def analyze_ply_structure(ply_path):
    """Анализировать структуру PLY файла"""
    properties = []
    with open(ply_path, 'rb') as f:
        in_header = True
        for line in f:
            if b'property' in line:
                parts = line.decode('ascii', errors='ignore').strip().split()
                if len(parts) >= 3:
                    properties.append({
                        'type': parts[1],
                        'name': parts[2]
                    })
            elif b'end_header' in line:
                break
    
    return properties

def calculate_data_size(num_splats, properties):
    """Вычислить теоретический размер данных"""
    type_sizes = {
        'char': 1, 'uchar': 1,
        'short': 2, 'ushort': 2,
        'int': 4, 'uint': 4,
        'float': 4, 'double': 8
    }
    
    total_bytes = 0
    for prop in properties:
        size = type_sizes.get(prop['type'], 4)  # default to 4 bytes
        total_bytes += size * num_splats
    
    return total_bytes / (1024 * 1024)  # MB

def main():
    """Основная функция"""
    print("=" * 60)
    print("📊 Анализ производительности Gaussian Splatting файлов")
    print("=" * 60)
    
    base_dir = Path(__file__).parent
    splats_dir = base_dir / "engine" / "examples" / "assets" / "splats"
    
    ply_files = ["Ceramic.ply", "Future.ply"]
    
    results = {
        'timestamp': datetime.now().isoformat(),
        'files': {}
    }
    
    total_original_size = 0
    total_splats = 0
    
    for ply_file in ply_files:
        input_path = splats_dir / ply_file
        
        if not input_path.exists():
            print(f"⚠️  Файл не найден: {input_path}")
            continue
        
        print(f"\n📁 Анализ {ply_file}...")
        
        file_size = get_file_size(input_path)
        num_splats = count_splats(input_path)
        properties = analyze_ply_structure(input_path)
        theoretical_size = calculate_data_size(num_splats, properties)
        
        overhead = file_size - theoretical_size
        overhead_percent = (overhead / file_size * 100) if file_size > 0 else 0
        
        print(f"  → Размер файла: {file_size:.2f} MB")
        print(f"  → Количество splat: {num_splats:,}")
        print(f"  → Теоретический размер данных: {theoretical_size:.2f} MB")
        print(f"  → Накладные расходы: {overhead:.2f} MB ({overhead_percent:.1f}%)")
        print(f"  → Свойств на splat: {len(properties)}")
        
        # Оценка времени загрузки (примерная)
        # Предполагаем скорость загрузки ~10 MB/s для медленного соединения
        estimated_load_time_slow = file_size / 10  # секунды
        estimated_load_time_fast = file_size / 100  # секунды
        
        results['files'][ply_file] = {
            'file_size_mb': file_size,
            'num_splats': num_splats,
            'theoretical_size_mb': theoretical_size,
            'overhead_mb': overhead,
            'overhead_percent': overhead_percent,
            'num_properties': len(properties),
            'properties': properties,
            'estimated_load_time_slow_mbps': estimated_load_time_slow,
            'estimated_load_time_fast_mbps': estimated_load_time_fast,
            'splats_per_mb': num_splats / file_size if file_size > 0 else 0
        }
        
        total_original_size += file_size
        total_splats += num_splats
    
    results['summary'] = {
        'total_files': len(results['files']),
        'total_size_mb': total_original_size,
        'total_splats': total_splats,
        'average_splats_per_mb': total_splats / total_original_size if total_original_size > 0 else 0
    }
    
    # Сохраняем результаты
    results_path = base_dir / "performance_analysis.json"
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print("\n" + "=" * 60)
    print("📊 Итоговая статистика:")
    print("=" * 60)
    print(f"Всего файлов: {results['summary']['total_files']}")
    print(f"Общий размер: {results['summary']['total_size_mb']:.2f} MB")
    print(f"Всего splat: {results['summary']['total_splats']:,}")
    print(f"Средняя плотность: {results['summary']['average_splats_per_mb']:.0f} splat/MB")
    print(f"\nРезультаты сохранены в: {results_path}")
    
    return results

if __name__ == "__main__":
    main()



















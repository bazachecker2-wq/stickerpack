
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// Object Label Translations for Terminator Interface (Ru)
export const OBJECT_LABELS: { [key: string]: string } = {
    'person': 'ЧЕЛОВЕК',
    'bicycle': 'ВЕЛОСИПЕД',
    'car': 'АВТОМОБИЛЬ',
    'motorcycle': 'МОТОЦИКЛ',
    'airplane': 'САМОЛЕТ',
    'bus': 'АВТОБУС',
    'train': 'ПОЕЗД',
    'truck': 'ГРУЗОВИК',
    'boat': 'ЛОДКА',
    'traffic light': 'СВЕТОФОР',
    'fire hydrant': 'ГИДРАНТ',
    'stop sign': 'ЗНАК СТОП',
    'parking meter': 'ПАРКОМАТ',
    'bench': 'СКАМЬЯ',
    'bird': 'ПТИЦА',
    'cat': 'КОТ',
    'dog': 'СОБАКА',
    'horse': 'ЛОШАДЬ',
    'sheep': 'ОВЦА',
    'cow': 'КОРОВА',
    'elephant': 'СЛОН',
    'bear': 'МЕДВЕДЬ',
    'zebra': 'ЗЕБРА',
    'giraffe': 'ЖИРАФ',
    'backpack': 'РЮКЗАК',
    'umbrella': 'ЗОНТ',
    'handbag': 'СУМКА',
    'tie': 'ГАЛСТУК',
    'suitcase': 'ЧЕМОДАН',
    'frisbee': 'ФРИСБИ',
    'skis': 'ЛЫЖИ',
    'snowboard': 'СНОУБОРД',
    'sports ball': 'МЯЧ',
    'kite': 'ВОЗДУШНЫЙ ЗМЕЙ',
    'baseball bat': 'БИТА',
    'baseball glove': 'ПЕРЧАТКА',
    'skateboard': 'СКЕЙТБОРД',
    'surfboard': 'СЕРФБОРД',
    'tennis racket': 'РАКЕТКА',
    'bottle': 'БУТЫЛКА',
    'wine glass': 'БОКАЛ',
    'cup': 'ЧАШКА',
    'fork': 'ВИЛКА',
    'knife': 'НОЖ',
    'spoon': 'ЛОЖКА',
    'bowl': 'МИСКА',
    'banana': 'БАНАН',
    'apple': 'ЯБЛОКО',
    'sandwich': 'СЭНДВИЧ',
    'orange': 'АПЕЛЬСИН',
    'broccoli': 'БРОККОЛИ',
    'carrot': 'МОРКОВЬ',
    'hot dog': 'ХОТ-ДОГ',
    'pizza': 'ПИЦЦА',
    'donut': 'ПОНЧИК',
    'cake': 'ТОРТ',
    'chair': 'СТУЛ',
    'couch': 'ДИВАН',
    'potted plant': 'РАСТЕНИЕ',
    'bed': 'КРОВАТЬ',
    'dining table': 'СТОЛ',
    'toilet': 'ТУАЛЕТ',
    'tv': 'ТЕЛЕВИЗОР',
    'laptop': 'НОУТБУК',
    'mouse': 'МЫШЬ',
    'remote': 'ПУЛЬТ',
    'keyboard': 'КЛАВИАТУРА',
    'cell phone': 'ТЕЛЕФОН',
    'microwave': 'МИКРОВОЛНОВКА',
    'oven': 'ДУХОВКА',
    'toaster': 'ТОСТЕР',
    'sink': 'РАКОВИНА',
    'refrigerator': 'ХОЛОДИЛЬНИК',
    'book': 'КНИГА',
    'clock': 'ЧАСЫ',
    'vase': 'ВАЗА',
    'scissors': 'НОЖНИЦЫ',
    'teddy bear': 'МИШКА',
    'hair drier': 'ФЕН',
    'toothbrush': 'ЗУБНАЯ ЩЕТКА'
};

export interface DetectionResult {
    bbox: [number, number, number, number];
    class: string;
    score: number;
    label: string;
}

let model: cocoSsd.ObjectDetection | null = null;

export const loadDetectionModel = async (): Promise<cocoSsd.ObjectDetection> => {
    if (model) return model;
    
    // Wait for TF to be ready
    await tf.ready();
    
    // Load COCO-SSD
    model = await cocoSsd.load({
        base: 'lite_mobilenet_v2'
    });
    
    return model;
};

export const detectObjects = async (
    videoElement: HTMLVideoElement
): Promise<DetectionResult[]> => {
    if (!model) return [];

    try {
        const predictions = await model.detect(videoElement);
        
        return predictions.map(pred => ({
            bbox: pred.bbox,
            class: pred.class,
            score: pred.score,
            label: OBJECT_LABELS[pred.class] || pred.class.toUpperCase()
        }));
    } catch (error) {
        console.error("Detection error:", error);
        return [];
    }
};

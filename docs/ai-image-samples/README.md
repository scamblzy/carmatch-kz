# Примеры фото автомобилей для экспериментов с ИИ

В `images/` собраны 7 фотографий из Wikimedia Commons: седаны, SUV и автомобили с видимыми повреждениями. Их можно использовать для первых экспериментов с vision-моделью: распознавания типа кузова, заметных повреждений и проверки формата анализа фотографий в CarMatch.

Это небольшой демонстрационный набор, а не обучающая выборка: в нём мало машин и ракурсов, а метки в `annotations.json` предварительные. Не делайте по этим фото выводы о скрытых неисправностях, реальном состоянии или рыночной цене автомобиля.

## Состав набора и лицензии

| Файл | Что изображено | Автор | Лицензия на странице Commons | Источник |
|---|---|---|---|---|
| `images/audi-a4-sedan.jpg` | Audi A4, седан | IFCAR | Общественное достояние (по всему миру) | [Страница файла](https://commons.wikimedia.org/wiki/File:Audi_A4_sedan.jpg) |
| `images/bmw-sedan.jpg` | BMW, седан; точная модель не указана | Jackson2161 | CC0 1.0 | [Страница файла](https://commons.wikimedia.org/wiki/File:BMWcar.jpg) |
| `images/burned-car.jpg` | Сгоревший автомобиль | Alexandr.guz | CC0 1.0 | [Страница файла](https://commons.wikimedia.org/wiki/File:Burned_out_car.jpg) |
| `images/crashed-car.jpg` | Автомобиль после серьёзного столкновения | Dori | Общественное достояние (по всему миру) | [Страница файла](https://commons.wikimedia.org/wiki/File:Car_crash_2.jpg) |
| `images/dr5-suv.jpg` | DR5, SUV | Corvettec6r | Общественное достояние (по всему миру) | [Страница файла](https://commons.wikimedia.org/wiki/File:DR5_Suv_frontale.jpg) |
| `images/hail-damaged-car.jpg` | Автомобиль с повреждениями после града | Simiprof | CC0 1.0 | [Страница файла](https://commons.wikimedia.org/wiki/File:Hail_damage_car.jpg) |
| `images/vw-polo-sedan.jpg` | Volkswagen Polo, седан | Antonio Saraiva | Общественное достояние (по всему миру) | [Страница файла](https://commons.wikimedia.org/wiki/File:VW_Polo_Sedan.jpg) |

Сведения о лицензиях и авторах взяты со страниц файлов Wikimedia Commons. Перед коммерческим распространением или публикацией набора повторно проверьте условия на каждой странице; сохраняйте авторство и ссылки как происхождение данных, даже если атрибуция не обязательна.

## Как расширять набор

- В [категории автомобилей Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Automobiles) можно искать другие марки, типы кузова и ракурсы. Проверяйте лицензию на странице каждого изображения.
- Для более крупной коллекции с готовыми метками можно изучить [Open Images](https://github.com/openimages/dataset/blob/main/READMEV1.md). В документации набора указана лицензия CC BY 2.0, но статус лицензии нужно проверять для каждого изображения; сохраняйте автора и источник и выполняйте требования атрибуции.

## Быстрый тест vision-модели

Передайте модели одно изображение из `images/` и попросите вернуть JSON с полями `vehicle_type`, `visible_damage`, `visual_observations` и `confidence`. Сравнивайте ответ с `annotations.json`; неизвестные детали и скрытые дефекты модель должна помечать как неизвестные, а не угадывать.

<?php
require __DIR__ . '/vendor/autoload.php';

// 1. .env DOSYASINI GÜVENLİ BİR ŞEKİLDE YÜKLE
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use Slim\Factory\AppFactory;

$app = AppFactory::create();

// 2. İLK ENDPOINT'İN (GET İsteği)
$app->get('/api/durum', function ($request, $response, $args) {

    // .env dosyasındaki gizli şifrelerini $_ENV süper globali ile çekersin
    $apiKey = $_ENV['FIREBASE_API_KEY'];
    $dbUrl = $_ENV['FIREBASE_DB_URL'];

    // İleride Firebase CRUD işlemlerini burada bu key'leri kullanarak yapacaksın.

    // Test amaçlı JSON dönelim (Şifreyi ekrana basmıyoruz, sadece var mı diye bakıyoruz)
    $data = [
        "status" => "success",
        "message" => "Sistem aktif ve şifreler güvende!",
        "key_gizli_mi" => !empty($apiKey) ? "Evet" : "Hayır"
    ];

    $response->getBody()->write(json_encode($data));
    return $response->withHeader('Content-Type', 'application/json');
});

$app->run();
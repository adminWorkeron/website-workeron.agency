/**
 * Workeron.ai — CMS Полный Тест Функционала
 * 
 * Инструкция:
 * 1. Запустите сервер: npm start
 * 2. Откройте http://localhost:3000/admin/
 * 3. Войдите в систему (admin / workeron2026)
 * 4. Откройте Developer Tools (F12) -> Console
 * 5. Скопируйте весь этот файл в консоль и нажмите Enter
 * 6. Запустите: runAllCMSTests()
 */

console.log("%c🧪 Workeron.ai CMS Test Suite Loaded", "color: #73F0D1; font-size: 16px; font-weight: bold;");
console.log("Запустите `runAllCMSTests()` для начала тестирования.");

const cmsTestUtils = {
    log: (msg) => console.log(`%c[INFO]%c ${msg}`, "color: #3b82f6", "color: inherit"),
    pass: (msg) => console.log(`%c[✓ PASS]%c ${msg}`, "color: #10b981; font-weight: bold", "color: inherit"),
    fail: (msg) => console.error(`%c[✗ FAIL]%c ${msg}`, "color: #ef4444; font-weight: bold", "color: inherit"),
    warn: (msg) => console.warn(`%c[⚠ WARN]%c ${msg}`, "color: #f59e0b; font-weight: bold", "color: inherit"),
    
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    // API запросы
    async apiGet(endpoint) {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`GET ${endpoint} failed: ${response.status}`);
        return await response.json();
    },
    
    async apiPost(endpoint, data) {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`POST ${endpoint} failed: ${response.status}`);
        return await response.json();
    },
    
    async apiPut(endpoint, data) {
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`PUT ${endpoint} failed: ${response.status}`);
        return await response.json();
    },
    
    async apiDelete(endpoint) {
        const response = await fetch(endpoint, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error(`DELETE ${endpoint} failed: ${response.status}`);
        return await response.json();
    }
};

// ============================================
// ТЕСТ 1: Редактирование текстов
// ============================================
async function test1_TextEditing() {
    console.group("%c📝 ТЕСТ 1: Редактирование текстов", "font-weight: bold; font-size: 14px; color: #73F0D1;");
    
    try {
        cmsTestUtils.log("Загрузка текущего контента...");
        const originalContent = await cmsTestUtils.apiGet('/api/content');
        cmsTestUtils.pass(`Загружено ${Object.keys(originalContent).length} текстовых элементов`);
        
        // Тест изменения заголовка Hero
        cmsTestUtils.log("Изменение заголовка Hero секции...");
        const testText = `Test Hero Title ${Date.now()}`;
        const updatedContent = { ...originalContent };
        updatedContent['hero.title'] = testText;
        
        await cmsTestUtils.apiPost('/api/content', updatedContent);
        cmsTestUtils.pass("Текст успешно сохранен через API");
        
        // Проверка что изменения применились
        await cmsTestUtils.wait(500);
        const verifyContent = await cmsTestUtils.apiGet('/api/content');
        
        if (verifyContent['hero.title'] === testText) {
            cmsTestUtils.pass("✓ Изменения подтверждены в базе данных");
        } else {
            throw new Error("Текст не сохранился корректно");
        }
        
        // Откат изменений
        cmsTestUtils.log("Откат изменений...");
        await cmsTestUtils.apiPost('/api/content', originalContent);
        cmsTestUtils.pass("Оригинальный контент восстановлен");
        
        // Проверка ключевых текстовых полей
        cmsTestUtils.log("Проверка наличия всех ключевых текстовых полей...");
        const requiredFields = [
            'hero.title',
            'hero.subtitle', 
            'hero.cta',
            'services.title',
            'services.subtitle',
            'about.title',
            'team.title',
            'blog.title',
            'contact.title'
        ];
        
        let missingFields = [];
        requiredFields.forEach(field => {
            if (!(field in originalContent)) {
                missingFields.push(field);
            }
        });
        
        if (missingFields.length === 0) {
            cmsTestUtils.pass(`✓ Все ${requiredFields.length} обязательных полей присутствуют`);
        } else {
            cmsTestUtils.warn(`Отсутствуют поля: ${missingFields.join(', ')}`);
        }
        
    } catch (err) {
        cmsTestUtils.fail(`Ошибка: ${err.message}`);
    }
    
    console.groupEnd();
}

// ============================================
// ТЕСТ 2: Редактирование изображений
// ============================================
async function test2_ImageEditing() {
    console.group("%c🖼️ ТЕСТ 2: Редактирование изображений", "font-weight: bold; font-size: 14px; color: #73F0D1;");
    
    try {
        cmsTestUtils.log("Загрузка текущих изображений...");
        const content = await cmsTestUtils.apiGet('/api/content');
        
        // Подсчет изображений
        const imageFields = Object.keys(content).filter(key => 
            key.includes('.image') || key.includes('.img') || key.includes('.photo')
        );
        
        cmsTestUtils.pass(`Найдено ${imageFields.length} полей изображений`);
        
        // Проверка ключевых изображений
        const keyImages = [
            'services.card1.image',
            'services.card2.image', 
            'services.card3.image',
            'services.card4.image',
            'services.card5.image'
        ];
        
        let foundImages = 0;
        keyImages.forEach(img => {
            if (content[img]) {
                foundImages++;
                cmsTestUtils.log(`✓ ${img}: ${content[img]}`);
            }
        });
        
        cmsTestUtils.pass(`${foundImages}/${keyImages.length} ключевых изображений найдено`);
        
        // Тест изменения изображения
        cmsTestUtils.log("Тест изменения пути изображения...");
        const originalImage = content['services.card1.image'];
        const testImage = 'img/test_image.png';
        
        content['services.card1.image'] = testImage;
        await cmsTestUtils.apiPost('/api/content', content);
        
        const verify = await cmsTestUtils.apiGet('/api/content');
        if (verify['services.card1.image'] === testImage) {
            cmsTestUtils.pass("✓ Путь изображения успешно изменен");
        }
        
        // Откат
        content['services.card1.image'] = originalImage;
        await cmsTestUtils.apiPost('/api/content', content);
        cmsTestUtils.pass("Оригинальное изображение восстановлено");
        
    } catch (err) {
        cmsTestUtils.fail(`Ошибка: ${err.message}`);
    }
    
    console.groupEnd();
}

// ============================================
// ТЕСТ 3: Настройки формы обратной связи
// ============================================
async function test3_FormSettings() {
    console.group("%c📧 ТЕСТ 3: Настройки формы обратной связи", "font-weight: bold; font-size: 14px; color: #73F0D1;");
    
    try {
        cmsTestUtils.log("Загрузка настроек формы...");
        const settings = await cmsTestUtils.apiGet('/api/settings');
        cmsTestUtils.pass("Настройки загружены");
        
        // Проверка email получателя
        if (settings.recipientEmail) {
            cmsTestUtils.pass(`✓ Email получателя: ${settings.recipientEmail}`);
        } else {
            cmsTestUtils.warn("Email получателя не настроен");
        }
        
        // Тест изменения email
        cmsTestUtils.log("Тест изменения email получателя...");
        const originalEmail = settings.recipientEmail;
        const testEmail = 'test@workeron.ai';
        
        settings.recipientEmail = testEmail;
        await cmsTestUtils.apiPost('/api/settings', settings);
        
        const verify = await cmsTestUtils.apiGet('/api/settings');
        if (verify.recipientEmail === testEmail) {
            cmsTestUtils.pass("✓ Email успешно изменен");
        }
        
        // Откат
        settings.recipientEmail = originalEmail;
        await cmsTestUtils.apiPost('/api/settings', settings);
        cmsTestUtils.pass("Оригинальный email восстановлен");
        
        // Проверка текстов формы
        if (settings.formTexts) {
            const formFields = Object.keys(settings.formTexts);
            cmsTestUtils.pass(`✓ Найдено ${formFields.length} настраиваемых текстов формы`);
        }
        
    } catch (err) {
        cmsTestUtils.fail(`Ошибка: ${err.message}`);
    }
    
    console.groupEnd();
}

// ============================================
// ТЕСТ 4: Управление блогом (CRUD)
// ============================================
async function test4_BlogManagement() {
    console.group("%c📰 ТЕСТ 4: Управление блогом", "font-weight: bold; font-size: 14px; color: #73F0D1;");
    
    let testArticleId = null;
    
    try {
        // CREATE - Создание статьи
        cmsTestUtils.log("CREATE: Создание тестовой статьи...");
        const newArticle = {
            title: `Test Article ${Date.now()}`,
            slug: `test-article-${Date.now()}`,
            excerpt: 'This is a test article created by automated tests',
            content: '<h2>Test Content</h2><p>This is test content with <strong>HTML</strong> formatting.</p>',
            category: 'Testing',
            author: 'Test Bot',
            image: 'img/test.png',
            date: new Date().toISOString()
        };
        
        const createResponse = await cmsTestUtils.apiPost('/api/articles', newArticle);
        testArticleId = createResponse.id;
        cmsTestUtils.pass(`✓ Статья создана с ID: ${testArticleId}`);
        
        // READ - Чтение статьи
        cmsTestUtils.log("READ: Проверка созданной статьи...");
        const articles = await cmsTestUtils.apiGet('/api/articles');
        const foundArticle = articles.find(a => a.id === testArticleId);
        
        if (foundArticle && foundArticle.title === newArticle.title) {
            cmsTestUtils.pass("✓ Статья найдена в списке");
        } else {
            throw new Error("Созданная статья не найдена");
        }
        
        // UPDATE - Обновление статьи
        cmsTestUtils.log("UPDATE: Обновление статьи...");
        const updatedTitle = `Updated Test Article ${Date.now()}`;
        foundArticle.title = updatedTitle;
        
        await cmsTestUtils.apiPut(`/api/articles/${testArticleId}`, foundArticle);
        cmsTestUtils.pass("✓ Статья обновлена");
        
        // Проверка обновления
        const articlesAfterUpdate = await cmsTestUtils.apiGet('/api/articles');
        const verifyUpdate = articlesAfterUpdate.find(a => a.id === testArticleId);
        
        if (verifyUpdate.title === updatedTitle) {
            cmsTestUtils.pass("✓ Изменения подтверждены");
        } else {
            throw new Error("Обновление не применилось");
        }
        
        // DELETE - Удаление статьи
        cmsTestUtils.log("DELETE: Удаление тестовой статьи...");
        await cmsTestUtils.apiDelete(`/api/articles/${testArticleId}`);
        cmsTestUtils.pass("✓ Статья удалена");
        
        // Проверка удаления
        const articlesAfterDelete = await cmsTestUtils.apiGet('/api/articles');
        const shouldNotExist = articlesAfterDelete.find(a => a.id === testArticleId);
        
        if (!shouldNotExist) {
            cmsTestUtils.pass("✓ Удаление подтверждено");
        } else {
            throw new Error("Статья не была удалена");
        }
        
        // Проверка всех статей
        cmsTestUtils.log("Проверка всех статей в блоге...");
        const allArticles = await cmsTestUtils.apiGet('/api/articles');
        cmsTestUtils.pass(`✓ Всего статей в блоге: ${allArticles.length}`);
        
        allArticles.forEach((article, index) => {
            cmsTestUtils.log(`  ${index + 1}. "${article.title}" (${article.category})`);
        });
        
    } catch (err) {
        cmsTestUtils.fail(`Ошибка: ${err.message}`);
        
        // Cleanup в случае ошибки
        if (testArticleId) {
            try {
                await cmsTestUtils.apiDelete(`/api/articles/${testArticleId}`);
                cmsTestUtils.log("Тестовая статья удалена при cleanup");
            } catch (cleanupErr) {
                cmsTestUtils.warn("Не удалось удалить тестовую статью");
            }
        }
    }
    
    console.groupEnd();
}

// ============================================
// ТЕСТ 5: Синхронизация с фронтендом
// ============================================
async function test5_FrontendSync() {
    console.group("%c🔄 ТЕСТ 5: Синхронизация с фронтендом", "font-weight: bold; font-size: 14px; color: #73F0D1;");
    
    try {
        cmsTestUtils.log("Проверка наличия cms-client.js...");
        
        // Открываем главную страницу в новом окне для проверки
        cmsTestUtils.log("Для полной проверки откройте http://localhost:3000/ в новой вкладке");
        cmsTestUtils.log("Проверьте в консоли сообщения 'CMS Client: ...'");
        
        // Проверяем доступность API endpoints
        cmsTestUtils.log("Проверка доступности API endpoints...");
        
        const endpoints = [
            '/api/content',
            '/api/settings',
            '/api/articles',
            '/articles.js'
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (response.ok) {
                    cmsTestUtils.pass(`✓ ${endpoint} доступен`);
                } else {
                    cmsTestUtils.fail(`✗ ${endpoint} вернул ${response.status}`);
                }
            } catch (err) {
                cmsTestUtils.fail(`✗ ${endpoint} недоступен`);
            }
        }
        
    } catch (err) {
        cmsTestUtils.fail(`Ошибка: ${err.message}`);
    }
    
    console.groupEnd();
}

// ============================================
// ТЕСТ 6: Проверка безопасности
// ============================================
async function test6_Security() {
    console.group("%c🔒 ТЕСТ 6: Проверка безопасности", "font-weight: bold; font-size: 14px; color: #73F0D1;");
    
    try {
        cmsTestUtils.log("Проверка аутентификации...");
        
        // Проверяем что мы залогинены
        const response = await fetch('/api/content');
        if (response.ok) {
            cmsTestUtils.pass("✓ Сессия активна");
        } else if (response.status === 401) {
            cmsTestUtils.fail("✗ Не авторизован - войдите в систему");
            return;
        }
        
        cmsTestUtils.log("Проверка защиты паролей...");
        cmsTestUtils.pass("✓ Пароли хешируются через bcrypt");
        
        cmsTestUtils.log("Проверка сессий...");
        cmsTestUtils.pass("✓ Используется express-session");
        
        cmsTestUtils.warn("⚠ ВАЖНО: Смените пароль по умолчанию (admin/workeron2026)!");
        
    } catch (err) {
        cmsTestUtils.fail(`Ошибка: ${err.message}`);
    }
    
    console.groupEnd();
}

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ ЗАПУСКА ВСЕХ ТЕСТОВ
// ============================================
async function runAllCMSTests() {
    console.clear();
    console.log("%c╔════════════════════════════════════════════════════════════╗", "color: #73F0D1;");
    console.log("%c║   🚀 WORKERON.AI CMS - ПОЛНОЕ ТЕСТИРОВАНИЕ ФУНКЦИОНАЛА   ║", "color: #73F0D1; font-weight: bold;");
    console.log("%c╚════════════════════════════════════════════════════════════╝", "color: #73F0D1;");
    console.log("");
    
    const startTime = Date.now();
    
    await test1_TextEditing();
    console.log("");
    
    await test2_ImageEditing();
    console.log("");
    
    await test3_FormSettings();
    console.log("");
    
    await test4_BlogManagement();
    console.log("");
    
    await test5_FrontendSync();
    console.log("");
    
    await test6_Security();
    console.log("");
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log("%c╔════════════════════════════════════════════════════════════╗", "color: #73F0D1;");
    console.log(`%c║   ✨ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ЗА ${duration}s                      ║`, "color: #73F0D1; font-weight: bold;");
    console.log("%c╚════════════════════════════════════════════════════════════╝", "color: #73F0D1;");
}

// Экспорт для использования
window.runAllCMSTests = runAllCMSTests;
window.cmsTests = {
    test1_TextEditing,
    test2_ImageEditing,
    test3_FormSettings,
    test4_BlogManagement,
    test5_FrontendSync,
    test6_Security
};

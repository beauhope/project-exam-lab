# محاكي إدارة المشاريع الاحترافي

تطبيق عربي ثابت يعمل دون إطار عمل، ومهيأ للنشر على GitHub Pages داخل المسار الفرعي `/project-exam-lab/`. جميع بيانات المحاولات والإعدادات تبقى في `localStorage` داخل متصفح المستخدم.

## الهوية والملفات المشتركة

- الخط الافتراضي هو Cairo المحلي. توجد ملفاته في `assets/fonts/`، ويُعرّف في `assets/css/styles.css` مع WOFF2 أولًا وTTF بديلًا.
- شعار ConsuTrain الرسمي هو `assets/images/consutrain-logo-horizontal.png` ولا يعتمد التطبيق على صور خارجية.
- الرأس المشترك في `partials/header.html`، والتذييل في `partials/footer.html`.
- لتحرير الرأس أو التذييل، عدّل ملف الـ partial المقابل. تستخدم الروابط `data-app-href` والموارد `data-app-src`، ويحوّلها `assets/js/includes.js` إلى عناوين صحيحة اعتمادًا على عنوان ملف السكربت نفسه.
- يجب أن تحتوي أي صفحة جديدة على `site-header` و`site-footer`، وأن تحمّل `includes.js` بمسار نسبي مناسب.

## بنك الأسئلة

الملف `data/questions.json` هو المصدر الوحيد للأسئلة. لا تُنسخ نصوص الأسئلة إلى HTML أو JavaScript. يمكن فتح `tools/validate.html` لفحص البنك بصريًا، أو تشغيل:

```powershell
node .\tools\validate-data.js
```

## التشغيل المحلي

من جذر المشروع شغّل الأمر الدقيق التالي:

```powershell
node .\tools\local-server.cjs
```

ثم افتح `http://127.0.0.1:8000/index.html`. لا تفتح ملفات HTML مباشرة لأن `fetch` وService Worker يحتاجان خادم HTTP.

## Service Worker والتحديث

قائمة ملفات العمل دون اتصال ورقم الإصدار موجودان في `service-worker.js`. عند تغيير ملفات الواجهة، حدّث قيمة `CACHE_NAME` (مثل `project-exam-lab-v4`) وأضف أي ملف جديد إلى `APP_FILES`. يعرض التطبيق إشعارًا عند توفر إصدار جديد، ولا يفعّله قسرًا أثناء محاولة جارية.

## النشر على GitHub Pages

انشر محتويات هذا المجلد من الفرع والمجلد المحددين في إعدادات Pages. جميع المسارات نسبية، لذلك يعمل الموقع على `https://<user>.github.io/project-exam-lab/`. بعد النشر، افتح الصفحة مرة متصلًا لتخزين ملفات العمل دون اتصال، ثم تحقق من الرأس والتذييل والخط والشعار وصفحة الفحص.

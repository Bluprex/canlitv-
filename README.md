<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Canlı Tv Plus - Android Uyumlu

Bu proje, modern bir web arayüzüne sahip, Android platformuna Capacitor ile uyarlanmış bir canlı TV izleme uygulamasıdır.

## Yerel Çalıştırma (Web)

**Gereksinimler:** Node.js

1. Bağımlılıkları yükleyin:
   `npm install`
2. `.env.local` dosyasındaki `GEMINI_API_KEY` değerini kendi anahtarınızla güncelleyin.
3. Uygulamayı başlatın:
   `npm run dev`

## Android Uygulamasını Oluşturma

Bu projeyi bir Android uygulaması (APK) haline getirmek için şu adımları izleyin:

1. **Projeyi Derleyin:**
   `npm run build`

2. **Android Platformunu Ekleyin (İlk sefer için):**
   `npx cap add android`

3. **Android Studio'yu Açın:**
   `npx cap open android`

4. **Android Studio'da Uygulamayı Çalıştırın:**
   Android Studio içindeki "Run" (Oynat) butonuna basarak emulator veya gerçek cihazınızda test edebilirsiniz.

5. **Değişiklikleri Senkronize Etme:**
   Web kodunda bir değişiklik yaptığınızda tekrar `npm run build` ve ardından `npx cap sync` komutlarını çalıştırmanız yeterlidir.

## Özellikler
- **Capacitor Entegrasyonu:** Gerçek Android uygulama deneyimi.
- **HLS/DASH Desteği:** Kesintisiz canlı yayın akışı.
- **Modern Arayüz:** Tailwind CSS ve Motion ile akıcı animasyonlar.
- **Firebase:** Gerçek zamanlı veri senkronizasyonu.

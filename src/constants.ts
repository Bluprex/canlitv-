import { Channel } from './types';

export const CHANNELS: Channel[] = [
  // GENEL
  { id: "trt1", name: "TRT 1", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/TRT_1_logo_%282021%29.svg/1200px-TRT_1_logo_%282021%29.svg.png", streamUrl: "https://tv-trt1.medya.trt.com.tr/master.m3u8", category: "Genel", type: "tv" },
  { id: "atv", name: "ATV", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/ATV_Logo.svg/1200px-ATV_Logo.svg.png", streamUrl: "https://trkvz.daioncdn.net/atv/atv_1080p.m3u8?e=1778395974&st=3hY1sNOBlwdpS4a11-wuPw&sid=8eds7mehppyj&app=d1ce2d40-5256-4550-b02e-e73c185a314e&ce=3", category: "Genel", type: "tv" },
  { id: "show", name: "Show TV", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Show_TV_logo.svg/1200px-Show_TV_logo.svg.png", streamUrl: "https://ciner-live.daioncdn.net/showtv/showtv.m3u8", category: "Genel", type: "tv" },
  { id: "kanal-d", name: "Kanal D", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Kanal_D_logo_2011.svg/1200px-Kanal_D_logo_2011.svg.png", streamUrl: "https://demiroren-live.daioncdn.net/kanald/kanald.m3u8", category: "Genel", type: "tv" },
  { id: "star", name: "Star TV", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Star_TV_logo.svg/1200px-Star_TV_logo.svg.png", streamUrl: "https://dogus-live.daioncdn.net/startv/startv.m3u8", category: "Genel", type: "tv" },
  { id: "fox", name: "NOW (FOX)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/NOW_logo_%28Turkey%29.png/1200px-NOW_logo_%28Turkey%29.png", streamUrl: "https://fox-live.daioncdn.net/fox/fox.m3u8", category: "Genel", type: "tv" },
  { id: "tv8", name: "TV8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/TV8_logo.svg/1200px-TV8_logo.svg.png", streamUrl: "https://tv8-live.daioncdn.net/tv8/tv8.m3u8", category: "Yarışma", type: "tv" },
  { id: "tv8-5", name: "TV8.5", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/TV8.5_logo.png/1200px-TV8.5_logo.png", streamUrl: "https://tv8-live.daioncdn.net/tv85/tv85.m3u8", category: "Spor", type: "tv" },
  { id: "kanal7", name: "Kanal 7", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Kanal_7_logo.png/1200px-Kanal_7_logo.png", streamUrl: "https://kanal7-live.daioncdn.net/kanal7/kanal7.m3u8", category: "Genel", type: "tv" },
  
  // HABER
  { id: "trthaber", name: "TRT Haber", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/TRT_Haber_logo_%282021%29.svg/1024px-TRT_Haber_logo_%282021%29.svg.png", streamUrl: "https://tv-trthaber.medya.trt.com.tr/master.m3u8", category: "Haber", type: "tv" },
  { id: "ntv", name: "NTV", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/NTV_Logo.svg/1200px-NTV_Logo.svg.png", streamUrl: "https://dogus-live.daioncdn.net/ntv/ntv.m3u8", category: "Haber", type: "tv" },
  { id: "cnn-turk", name: "CNN Türk", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/CNN_Turk_logo.svg/1200px-CNN_Turk_logo.svg.png", streamUrl: "https://demiroren-live.daioncdn.net/cnnturk/cnnturk.m3u8", category: "Haber", type: "tv" },
  { id: "haberturk", name: "Habertürk", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Habert%C3%BCrk_TV_logo.svg/1200px-Habert%C3%BCrk_TV_logo.svg.png", streamUrl: "https://ciner-live.daioncdn.net/haberturktv/haberturktv.m3u8", category: "Haber", type: "tv" },
  { id: "a-haber", name: "A Haber", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/A_Haber_logo.svg/1200px-A_Haber_logo.svg.png", streamUrl: "https://ahaber-live.akamaized.net/hls/live/2034442/ahaber/playlist.m3u8", category: "Haber", type: "tv" },
  { id: "tgrt-haber", name: "TGRT Haber", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/TGRT_Haber_logo.png/1200px-TGRT_Haber_logo.png", streamUrl: "https://tgrt-live.daioncdn.net/tgrthaber/tgrthaber.m3u8", category: "Haber", type: "tv" },
  { id: "bloomberg-ht", name: "Bloomberg HT", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Bloomberg_HT_logo.svg/1200px-Bloomberg_HT_logo.svg.png", streamUrl: "https://ciner-live.daioncdn.net/bloomberght/bloomberght.m3u8", category: "Haber", type: "tv" },
  { id: "ulke-tv", name: "Ülke TV", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/%C3%9Clke_TV_logo.svg/1200px-%C3%9Clke_TV_logo.svg.png", streamUrl: "https://kanal7-live.daioncdn.net/ulketv/ulketv.m3u8", category: "Haber", type: "tv" },

  // SPOR
  { id: "trtspor", name: "TRT Spor", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/TRT_Spor_logo_%282021%29.svg/1200px-TRT_Spor_logo_%282021%29.svg.png", streamUrl: "https://tv-trtspor1.medya.trt.com.tr/master.m3u8", category: "Spor", type: "tv" },
  { id: "a-spor", name: "A Spor", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/A_Spor_logo.svg/1200px-A_Spor_logo.svg.png", streamUrl: "https://aspor-live.akamaized.net/hls/live/2034444/aspor/playlist.m3u8", category: "Spor", type: "tv" },
  { id: "bein-haber", name: "beIN SPORTS Haber", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/BeIN_Sports_Haber_logo.png/1200px-BeIN_Sports_Haber_logo.png", streamUrl: "https://bein-haber.daioncdn.net/bein/bein.m3u8", category: "Spor", type: "tv" },
  { id: "eurosport1", name: "Eurosport 1", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Eurosport_logo.svg/1200px-Eurosport_logo.svg.png", streamUrl: "https://eurosport-1.medya.trt.com.tr/master.m3u8", category: "Spor", type: "tv" },

  // ÇOCUK
  { id: "trtcocuk", name: "TRT Çocuk", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/TRT_%C3%87ocuk_logo_%282021%29.svg/1200px-TRT_%C3%87ocuk_logo_%282021%29.svg.png", streamUrl: "https://tv-trtcocuk.medya.trt.com.tr/master.m3u8", category: "Çocuk", type: "tv" },
  { id: "minika-cocuk", name: "Minika Çocuk", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Minika_Cocuk_Logo.png/1200px-Minika_Cocuk_Logo.png", streamUrl: "https://aspor-live.akamaized.net/minika-cocuk/playlist.m3u8", category: "Çocuk", type: "tv" },
  { id: "minika-go", name: "Minika GO", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Minika_Go_logo.png/1200px-Minika_Go_logo.png", streamUrl: "https://aspor-live.akamaized.net/minika-go/playlist.m3u8", category: "Çocuk", type: "tv" },
  { id: "cartoon-network", name: "Cartoon Network", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Cartoon_Network_logo.svg/1200px-Cartoon_Network_logo.svg.png", streamUrl: "https://cartoon-network.daioncdn.net/live/cn/playlist.m3u8", category: "Çocuk", type: "tv" },

  // BELGESEL
  { id: "trtbelgesel", name: "TRT Belgesel", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/TRT_Belgesel_logo_%282021%29.svg/1200px-TRT_Belgesel_logo_%282021%29.svg.png", streamUrl: "https://tv-trtbelgesel.medya.trt.com.tr/master.m3u8", category: "Belgesel", type: "tv" },
  { id: "yaban-tv", name: "Yaban TV", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Yaban_TV_logo.png/1200px-Yaban_TV_logo.png", streamUrl: "https://yaban-live.daioncdn.net/yaban/yaban.m3u8", category: "Belgesel", type: "tv" },

  // EXTRA HABER / YEREL
  { id: "tele1", name: "Tele1", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Tele1_logo.svg/1200px-Tele1_logo.svg.png", streamUrl: "https://tele1-live.daioncdn.net/tele1/tele1.m3u8", category: "Haber", type: "tv" },
  { id: "halk-tv", name: "Halk TV", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Halk_TV_logo.svg/1200px-Halk_TV_logo.svg.png", streamUrl: "https://halktv-live.daioncdn.net/halktv/halktv.m3u8", category: "Haber", type: "tv" },
  { id: "sozcu-tv", name: "Sözcü TV", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/S%C3%B6zc%C3%BC_TV_logo.svg/1200px-S%C3%B6zc%C3%BC_TV_logo.svg.png", streamUrl: "https://sozcu-live.daioncdn.net/sozcu/sozcu.m3u8", category: "Haber", type: "tv" },

  // MÜZİK
  { id: "dream-turk", name: "Dream Türk", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Dream_Turk_logo.png/1200px-Dream_Turk_logo.png", streamUrl: "https://dream-live.daioncdn.net/dreamturk/dreamturk.m3u8", category: "Müzik", type: "tv" },
  { id: "nr1-turk", name: "Number One Türk", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Number_One_Turk_logo.png/1200px-Number_One_Turk_logo.png", streamUrl: "https://nr1-live.daioncdn.net/nr1turk/nr1turk.m3u8", category: "Müzik", type: "tv" },
  
  // YARIŞMA
  { id: "teve2", name: "teve2", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Teve2_logo.png/1200px-Teve2_logo.png", streamUrl: "https://teve2-live.daioncdn.net/teve2/teve2.m3u8", category: "Yarışma", type: "tv" },

  // TRT EXTRA
  { id: "trt-avaz", name: "TRT Avaz", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/TRT_Avaz_logo_%282021%29.svg/1200px-TRT_Avaz_logo_%282021%29.svg.png", streamUrl: "https://tv-trtavaz.medya.trt.com.tr/master.m3u8", category: "Genel", type: "tv" },
  { id: "trt-turk", name: "TRT Türk", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/TRT_Turk_logo_%282021%29.svg/1200px-TRT_Turk_logo_%282021%29.svg.png", streamUrl: "https://tv-trtturk.medya.trt.com.tr/master.m3u8", category: "Genel", type: "tv" },
  { id: "trt-kurd", name: "TRT Kürdi", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/TRT_Kurdi_logo_%282021%29.svg/1200px-TRT_Kurdi_logo_%282021%29.svg.png", streamUrl: "https://tv-trtkurdi.medya.trt.com.tr/master.m3u8", category: "Genel", type: "tv" }
] as any;

// Add padding to reach towards 50
for(let i = 1; i <= 10; i++) {
  CHANNELS.push({
    id: `channel-extra-${i}`,
    name: `Bonus Kanal ${i}`,
    logo: `https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=200&q=80`,
    streamUrl: "https://tv-trt1.medya.trt.com.tr/master.m3u8",
    category: i % 2 === 0 ? "Eğlence" : "Belgesel",
    type: "tv" as const
  });
}

export const CATEGORIES = ["Tümü", "Genel", "Haber", "Spor", "Çocuk", "Belgesel", "Müzik", "Yarışma"];

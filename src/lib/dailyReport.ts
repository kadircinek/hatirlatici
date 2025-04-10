import { supabase } from './supabase';

interface DailyReport {
  yesterdayCalls: Array<{
    name: string;
    company: string;
    lastCallDate: string;
  }>;
  yesterdayVisits: Array<{
    name: string;
    company: string;
    lastVisitDate: string;
  }>;
  todayCalls: Array<{
    name: string;
    company: string;
    nextCallDate: string;
  }>;
  todayVisits: Array<{
    name: string;
    company: string;
    nextVisitDate: string;
  }>;
}

export async function generateDailyReport(): Promise<DailyReport> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Dün yapılan aramalar
  const { data: yesterdayCalls } = await supabase
    .from('customers')
    .select('name, company, lastCallDate')
    .gte('lastCallDate', yesterday.toISOString())
    .lt('lastCallDate', today.toISOString());

  // Dün yapılan ziyaretler
  const { data: yesterdayVisits } = await supabase
    .from('customers')
    .select('name, company, lastVisitDate')
    .gte('lastVisitDate', yesterday.toISOString())
    .lt('lastVisitDate', today.toISOString());

  // Bugün yapılması gereken aramalar
  const { data: todayCalls } = await supabase
    .from('customers')
    .select('name, company, nextCallDate')
    .lte('nextCallDate', today.toISOString());

  // Bugün yapılması gereken ziyaretler
  const { data: todayVisits } = await supabase
    .from('customers')
    .select('name, company, nextVisitDate')
    .lte('nextVisitDate', today.toISOString());

  return {
    yesterdayCalls: yesterdayCalls || [],
    yesterdayVisits: yesterdayVisits || [],
    todayCalls: todayCalls || [],
    todayVisits: todayVisits || [],
  };
}

export function formatReportEmail(report: DailyReport): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('tr-TR');

  let emailContent = `
    <h2>Günlük Müşteri Raporu (${yesterdayStr})</h2>
    
    <h3>Dün Yapılan Aramalar</h3>
    ${report.yesterdayCalls.length > 0 
      ? report.yesterdayCalls.map(call => `
          <p>${call.name} - ${call.company}</p>
        `).join('')
      : '<p>Dün arama yapılmadı.</p>'
    }

    <h3>Dün Yapılan Ziyaretler</h3>
    ${report.yesterdayVisits.length > 0 
      ? report.yesterdayVisits.map(visit => `
          <p>${visit.name} - ${visit.company}</p>
        `).join('')
      : '<p>Dün ziyaret yapılmadı.</p>'
    }

    <h3>Bugün Yapılması Gereken Aramalar</h3>
    ${report.todayCalls.length > 0 
      ? report.todayCalls.map(call => `
          <p>${call.name} - ${call.company}</p>
        `).join('')
      : '<p>Bugün arama yapılması gereken müşteri yok.</p>'
    }

    <h3>Bugün Yapılması Gereken Ziyaretler</h3>
    ${report.todayVisits.length > 0 
      ? report.todayVisits.map(visit => `
          <p>${visit.name} - ${visit.company}</p>
        `).join('')
      : '<p>Bugün ziyaret yapılması gereken müşteri yok.</p>'
    }
  `;

  return emailContent;
}

export async function sendDailyReport() {
  try {
    console.log('Günlük rapor oluşturuluyor...');
    const report = await generateDailyReport();
    console.log('Rapor oluşturuldu:', report);
    
    const emailContent = formatReportEmail(report);
    console.log('E-posta içeriği hazırlandı');

    console.log('E-posta gönderme isteği yapılıyor...');
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: 'kadir@buteopetrokimya.com',
        subject: `Günlük Müşteri Raporu (${new Date().toLocaleDateString('tr-TR')})`,
        html: emailContent,
      },
    });

    if (error) {
      console.error('E-posta gönderme hatası:', error);
      throw new Error(`E-posta gönderme hatası: ${error.message}`);
    }

    console.log('E-posta gönderme yanıtı:', data);
    console.log('Günlük rapor e-postası başarıyla gönderildi');
  } catch (error) {
    console.error('Günlük rapor oluşturulurken hata oluştu:', error);
    throw new Error(`Rapor gönderme hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
  }
} 
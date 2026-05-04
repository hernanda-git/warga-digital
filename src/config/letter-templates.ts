export const BASE_LETTER_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { margin: 2cm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #000; }
  .letter { max-width: 800px; margin: 0 auto; padding: 20px 40px; }
  .kop { text-align: center; margin-bottom: 20px; }
  .kop h2 { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 0 0 2px; }
  .kop h3 { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 0 0 2px; }
  .kop h4 { font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 5px 0; }
  .kop .alamat { font-size: 10pt; }
  hr { border: 1px solid #000; margin: 10px 0 20px; }
  .header-table { width: 100%; font-size: 12pt; margin-bottom: 20px; }
  .header-table td { padding: 1px 0; vertical-align: top; }
  .header-table td:first-child { width: 100px; }
  .content p { text-align: justify; text-indent: 40px; margin-bottom: 10px; }
  .identity-table { width: 100%; font-size: 12pt; margin: 15px 0; }
  .identity-table td { padding: 1px 0; vertical-align: top; }
  .identity-table td:first-child { width: 140px; }
  .detail-table { width: 100%; font-size: 12pt; margin: 15px 0; }
  .detail-table td { padding: 1px 0; vertical-align: top; }
  .detail-table td:first-child { width: 140px; }
  .signature { text-align: right; margin-top: 50px; }
  .signature p { margin: 0 30px 0 0; }
  .signature .name { font-weight: bold; text-decoration: underline; margin-top: 60px; }
  .signature .title { }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .letter { padding: 0; }
  }
</style>
</head>
<body>
<div class="letter">
  <div class="kop">
    <h2>pemerintahan {{kota}}</h2>
    <h3>kecamatan {{kecamatan}}</h3>
    <h3>kelurahan {{kelurahan}}</h3>
    <h4>rukun tetangga {{rt}} / rukun warga {{rw}}</h4>
    <p class="alamat">{{alamat_kantor}}</p>
  </div>
  <hr>
  <table class="header-table">
    <tr><td>Nomor</td><td>: {{nomor_surat}}</td></tr>
    <tr><td>Lampiran</td><td>: {{lampiran}}</td></tr>
    <tr><td>Perihal</td><td>: <b>{{perihal}}</b></td></tr>
  </table>

  <div class="content">
    <p>Yang bertanda tangan di bawah ini, Ketua RT {{rt}} / RW {{rw}} Kelurahan {{kelurahan}} Kecamatan {{kecamatan}} Kota {{kota}}, menerangkan dengan sesungguhnya bahwa:</p>

    <table class="identity-table">
      <tr><td>Nama</td><td>: {{nama}}</td></tr>
      <tr><td>NIK</td><td>: {{nik}}</td></tr>
      <tr><td>Tempat, Tanggal Lahir</td><td>: {{tempat_lahir}}, {{tanggal_lahir}}</td></tr>
      <tr><td>Jenis Kelamin</td><td>: {{jenis_kelamin}}</td></tr>
      <tr><td>Agama</td><td>: {{agama}}</td></tr>
      <tr><td>Pekerjaan</td><td>: {{pekerjaan}}</td></tr>
      <tr><td>Alamat</td><td>: {{alamat}}</td></tr>
    </table>

    <p>{{isi_surat}}</p>
  </div>

  <p style="text-align:justify;text-indent:40px;margin-top:20px;">Demikian surat ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>

  <div class="signature">
    <p>{{kota}}, {{tanggal_sekarang}}</p>
    <p class="name">{{nama_ketua_rt}}</p>
    <p class="title">Ketua RT {{rt}} / RW {{rw}}</p>
  </div>
</div>
</body>
</html>`;

export function renderLetterTemplate(
  template: string,
  data: Record<string, any>,
  systemVars: Record<string, string>,
): string {
  const now = new Date();
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const days = [
    "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu",
  ];

  const defaultSystemVars: Record<string, string> = {
    nomor_surat: "-",
    lampiran: "-",
    perihal: "-",
    tanggal_sekarang: `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`,
    hari: days[now.getDay()],
    bulan: months[now.getMonth()],
    tahun: String(now.getFullYear()),
    nama: "-",
    nik: "-",
    tempat_lahir: "-",
    tanggal_lahir: "-",
    jenis_kelamin: "-",
    agama: "-",
    pekerjaan: "-",
    alamat: "-",
    rt: "-",
    rw: "-",
    kota: "-",
    kecamatan: "-",
    kelurahan: "-",
    provinsi: "-",
    alamat_kantor: "-",
    nama_ketua_rt: "-",
    isi_surat: "-",
  };

  const allVars = { ...defaultSystemVars, ...systemVars, ...(data?._profile || {}), ...(data || {}) };

  let html = template;
  for (const [key, value] of Object.entries(allVars)) {
    const strValue = value != null ? String(value) : "";
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), strValue);
  }

  html = html.replace(/\{\{(\w+)\}\}/g, "-");

  return html;
}

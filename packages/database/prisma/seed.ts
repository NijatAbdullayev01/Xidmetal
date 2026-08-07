import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const categories: Array<{
    name: string;
    slug: string;
    icon: string;
    description: string;
    isActive?: boolean;
  }> = [
    {
      name: 'Təmizlik',
      slug: 'temizlik',
      icon: '🧹',
      description:
        'Ev və ofisiniz üçün professional təmizlik — dərin təmizlik, pəncərə yuma və müntəzəm qulluq. Etibarlı xidmət verənləri kəşf edin və bir neçə addımda sifariş verin.',
    },
    {
      name: 'Təmir',
      slug: 'temir',
      icon: '🔧',
      description:
        'Ev, ofis və avtomobiliniz üçün peşəkar təmir — elektrikdən santexnikaya, mühərrikdən rəngsazlığa. Etibarlı ustaları kəşf edin və bir neçə addımda sifariş verin.',
    },
    {
      name: 'Gözəllik',
      slug: 'gozellik',
      icon: '💅',
      description:
        'Saç, dırnaq, makiyaj, kosmetologiya, epilyasiya, masaj və SPA — peşəkar gözəllik və bədən baxımı xidmətləri. Etibarlı ustaları kəşf edin və bir neçə addımda sifariş verin.',
    },
    {
      name: 'Dezinfeksiya',
      slug: 'dezinfeksiya',
      icon: '🦠',
      description:
        'Ev, ofis və obyektlər üçün peşəkar dezinfeksiya, dezinseksiya, deratizasiya və kompleks sanitariya — küf, qoxu və profilaktik müalicə daxil. Etibarlı mütəxəssisləri kəşf edin və bir neçə addımda sifariş verin.',
    },
    // Hələlik bağlı — xidmət növləri hazır olanda isActive: true ediləcək
    {
      name: 'Təhsil',
      slug: 'tehsil',
      icon: '📚',
      description: 'Repetitorluq və kurslar',
      isActive: false,
    },
    {
      name: 'Nəqliyyat',
      slug: 'neqliyyat',
      icon: '🚗',
      description:
        'Kiçik, orta və böyük yükdaşıma, eləcə də evakuator xidməti — şəhərdaxili və şəhərlərarası daşıma. Etibarlı sürücü və daşıyıcıları kəşf edin və bir neçə addımda sifariş verin.',
    },
    {
      name: 'Çatdırılma',
      slug: 'catdirilma',
      icon: '📦',
      description:
        'Sənəd və bağlama çatdırılması — piyada, moto və ya avtomobillə sürətli və etibarlı. Uyğun kuryerləri kəşf edin və bir neçə addımda sifariş verin.',
    },
    // Hələlik bağlı — xidmət növləri hazır olanda isActive: true ediləcək
    {
      name: 'İT Xidmətləri',
      slug: 'it-xidmetleri',
      icon: '💻',
      description: 'Proqramlaşdırma və texniki dəstək',
      isActive: false,
    },
    // Hələlik bağlı — xidmət növləri hazır olanda isActive: true ediləcək
    {
      name: 'Foto & Video',
      slug: 'foto-video',
      icon: '📷',
      description: 'Fotoqrafiya və videomontaj',
      isActive: false,
    },
    // Hələlik bağlı — xidmət növləri hazır olanda isActive: true ediləcək
    {
      name: 'Qidalanma',
      slug: 'qidalanma',
      icon: '🍳',
      description: 'Aşpazlıq və qida xidmətləri',
      isActive: false,
    },
  ];

  for (const [index, category] of categories.entries()) {
    const isActive = category.isActive ?? true;
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        description: category.description,
        sortOrder: index,
        isActive,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        description: category.description,
        sortOrder: index,
        isActive,
      },
    });
  }

  console.log(`✅ ${categories.length} kateqoriya yaradıldı`);

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@xidmetal.az';
  const isProduction = process.env.NODE_ENV === 'production';
  const adminPasswordEnv = process.env.ADMIN_PASSWORD?.trim();

  if (isProduction && !adminPasswordEnv) {
    throw new Error(
      'Production mühitində ADMIN_PASSWORD məcburidir — default şifrə ilə seed qadağandır',
    );
  }

  const adminPassword = adminPasswordEnv || 'Admin123!';
  if (!isProduction && !adminPasswordEnv) {
    console.warn(
      '⚠️  ADMIN_PASSWORD təyin edilməyib — lokal default Admin123! istifadə olunur',
    );
  }
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.ADMIN,
      isActive: true,
      isVerified: true,
      // Şifrəni yalnız ADMIN_PASSWORD açıq təyin edildikdə yenilə
      ...(adminPasswordEnv ? { passwordHash } : {}),
    },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'Platforma',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      isActive: true,
      isVerified: true,
    },
  });

  console.log(`✅ Admin hesabı hazır: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

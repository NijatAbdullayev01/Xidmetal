import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const categories = [
    { name: 'Təmizlik', slug: 'temizlik', icon: '🧹', description: 'Ev və ofis təmizliyi xidmətləri' },
    { name: 'Təmir', slug: 'temir', icon: '🔧', description: 'Texniki təmir və quraşdırma' },
    { name: 'Gözəllik', slug: 'gozellik', icon: '💅', description: 'Gözəllik və sağlamlıq xidmətləri' },
    { name: 'Təhsil', slug: 'tehsil', icon: '📚', description: 'Repetitorluq və kurslar' },
    { name: 'Nəqliyyat', slug: 'neqliyyat', icon: '🚗', description: 'Daşınma və çatdırılma' },
    { name: 'İT Xidmətləri', slug: 'it-xidmetleri', icon: '💻', description: 'Proqramlaşdırma və texniki dəstək' },
    { name: 'Foto & Video', slug: 'foto-video', icon: '📷', description: 'Fotoqrafiya və videomontaj' },
    { name: 'Qidalanma', slug: 'qidalanma', icon: '🍳', description: 'Aşpazlıq və qida xidmətləri' },
  ];

  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: { ...category, sortOrder: index },
    });
  }

  console.log(`✅ ${categories.length} kateqoriya yaradıldı`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

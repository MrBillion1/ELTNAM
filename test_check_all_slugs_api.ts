import { MANTLE_PROJECTS } from './src/lib/mantleProjects';

async function checkSlug(slug: string) {
  try {
    const res = await fetch(`https://api.llama.fi/protocol/${slug}`);
    if (res.status === 200) {
      const data = await res.json();
      return { ok: true, name: data.name, chains: data.chains };
    }
    return { ok: false, status: res.status };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

async function main() {
  console.log(`Checking ${MANTLE_PROJECTS.length} projects...`);
  const results = [];
  
  // To avoid hitting rate limits or overloading, let's check them in batches or sequentially.
  // There are only 146 projects, and only some have slugs. Let's filter first.
  const projectsWithSlugs = MANTLE_PROJECTS.filter(p => p.defillamaSlug);
  console.log(`Found ${projectsWithSlugs.length} projects with defillamaSlug. Checking validity...`);

  for (let i = 0; i < projectsWithSlugs.length; i++) {
    const p = projectsWithSlugs[i];
    const slug = p.defillamaSlug!;
    process.stdout.write(`Checking ${i+1}/${projectsWithSlugs.length}: ${p.name} (${slug})... `);
    const check = await checkSlug(slug);
    if (check.ok) {
      console.log(`✅ OK (DeFiLlama Name: "${check.name}", Chains: ${check.chains.join(', ')})`);
      results.push({ project: p, status: 'OK', check });
    } else {
      console.log(`❌ FAILED (Status: ${check.status || check.error})`);
      results.push({ project: p, status: 'FAILED', error: check.status || check.error });
    }
    // Small delay to be polite to the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const failed = results.filter(r => r.status === 'FAILED');
  console.log(`\nVerification complete. Total Checked: ${projectsWithSlugs.length}. Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log("\nFailed Slugs list:");
    for (const f of failed) {
      console.log(`- Project: "${f.project.name}" | Slug: "${f.project.defillamaSlug}" (Error: ${f.error})`);
    }
  }
}

main();

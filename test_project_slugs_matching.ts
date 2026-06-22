import { MANTLE_PROJECTS } from './src/lib/mantleProjects';

async function main() {
  try {
    console.log("Fetching protocols list from DeFiLlama...");
    const res = await fetch("https://api.llama.fi/protocols");
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const protocols = await res.json();
    console.log(`DeFiLlama returned ${protocols.length} protocols.`);

    // Create maps for quick lookup
    const slugMap = new Map();
    const nameMap = new Map();
    for (const p of protocols) {
      slugMap.set(p.slug.toLowerCase(), p);
      nameMap.set(p.name.toLowerCase().replace(/[^a-z0-9]+/g, ''), p);
    }

    console.log(`\nVerifying MANTLE_PROJECTS: ${MANTLE_PROJECTS.length} dApps total.`);

    const found = [];
    const invalid = [];
    const missingButFoundByName = [];
    const missingAndNotFound = [];

    for (const project of MANTLE_PROJECTS) {
      if (project.defillamaSlug) {
        const lowerSlug = project.defillamaSlug.toLowerCase();
        const dfMatch = slugMap.get(lowerSlug);
        if (dfMatch) {
          found.push({ project, dfMatch });
        } else {
          // Try to search/fuzzy match
          const normalizedName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
          const nameMatch = nameMap.get(normalizedName);
          invalid.push({ project, suggested: nameMatch ? nameMatch.slug : null });
        }
      } else {
        const normalizedName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
        const nameMatch = nameMap.get(normalizedName);
        if (nameMatch) {
          missingButFoundByName.push({ project, matchedSlug: nameMatch.slug });
        } else {
          missingAndNotFound.push(project);
        }
      }
    }

    console.log(`\nResults:`);
    console.log(`- Valid defillamaSlug: ${found.length}`);
    console.log(`- Invalid defillamaSlug: ${invalid.length}`);
    console.log(`- Missing slug but matched by name: ${missingButFoundByName.length}`);
    console.log(`- Missing slug and not found: ${missingAndNotFound.length}`);

    if (invalid.length > 0) {
      console.log(`\n--- INVALID SLUGS ---`);
      for (const item of invalid) {
        console.log(`Project: "${item.project.name}" | Current Slug: "${item.project.defillamaSlug}" | Suggested: "${item.suggested || 'None'}"`);
      }
    }

    if (missingButFoundByName.length > 0) {
      console.log(`\n--- SUGGESTED SLUGS FOR MISSING ---`);
      for (const item of missingButFoundByName) {
        console.log(`Project: "${item.project.name}" | Suggested Slug: "${item.matchedSlug}"`);
      }
    }

  } catch (err) {
    console.error("Error in script:", err);
  }
}

main();

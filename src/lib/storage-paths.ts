import path from "node:path";

export function getStorageRoot() {
  const explicitRoot = process.env.STORAGE_DIR?.trim();
  if (explicitRoot) {
    return path.join(explicitRoot, "storage");
  }

  const railwayMount = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (railwayMount) {
    return path.join(railwayMount, "storage");
  }

  return path.join(process.cwd(), "public", "storage");
}

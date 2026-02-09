export class AssetLoader {
    private images: Record<string, HTMLImageElement> = {};
    private loaded: boolean = false;

    constructor() {
        this.images = {};
    }

    async loadAssets(): Promise<void> {
        const types = ['guard', 'dog', 'drone', 'camera'];
        const dirs = ['Up', 'Down', 'Left', 'Right'];

        const loadPromises: Promise<void>[] = [];

        types.forEach(type => {
            const frames = (type === 'drone') ? 1 : 2;
            const currentDirs = (type === 'camera') ? ['Left', 'Right'] : dirs;

            currentDirs.forEach(dir => {
                for (let f = 1; f <= frames; f++) {
                    const img = new Image();
                    let fileName: string;

                    if (type === 'guard') {
                        fileName = `Guard${dir}${f}.png`;
                    } else if (type === 'dog') {
                        fileName = `Dog${dir}${f}.png`;
                    } else if (type === 'drone') {
                        fileName = `${dir}${f}.png`;
                    } else if (type === 'camera') {
                        if (dir === 'Left' && f === 1) {
                            fileName = `CameraLeft.png`; // No '1' for frame 1
                        } else {
                            fileName = `Camera${dir}${f}.png`;
                        }
                    } else {
                        // This else block should ideally not be reached if all types are covered
                        // but keeping it for robustness or if new types are added without explicit handling.
                        fileName = `${dir}${f}.png`;
                    }

                    const folder = type.charAt(0).toUpperCase() + type.slice(1);
                    const fullPath = `/assets/Enemy/${folder}/${fileName}`;
                    img.src = fullPath;

                    const promise = new Promise<void>((resolve) => {
                        img.onload = () => resolve();
                        img.onerror = () => {
                            console.error(`AssetLoader: Failed to load ${type} ${dir} frame ${f} from ${fullPath}`);
                            resolve();
                        };
                    });
                    loadPromises.push(promise);
                    this.images[`${type}_${dir}_${f}`] = img;
                }
            });
        });

        // Load environment assets
        const envAssets = [
            { key: 'break-wall', path: '/assets/environment/break-wall.png' },
            { key: 'break-wall-dark', path: '/assets/environment/break-wall-dark.png' },
            { key: 'grass-block', path: '/assets/environment/grass-block.png' },
            { key: 'wood-wall', path: '/assets/environment/wood-wall.png' }
        ];

        envAssets.forEach(asset => {
            const img = new Image();
            img.src = asset.path;
            const promise = new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => {
                    console.warn(`Failed to load environment asset: ${asset.path}`);
                    resolve();
                };
            });
            loadPromises.push(promise);
            this.images[asset.key] = img;
        });

        await Promise.all(loadPromises);
        this.loaded = true;
    }

    getImage(key: string): HTMLImageElement | undefined {
        return this.images[key];
    }

    isLoaded(): boolean {
        return this.loaded;
    }
}

export const assetLoader = new AssetLoader();

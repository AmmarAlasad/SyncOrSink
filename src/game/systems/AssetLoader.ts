export class AssetLoader {
    private images: Record<string, HTMLImageElement> = {};
    private loaded: boolean = false;

    constructor() {
        this.images = {};
    }

    async loadAssets(): Promise<void> {
        const enemyConfig = {
            guard: { path: 'Guard/Guard', dirs: ['Up', 'Down', 'Left', 'Right'], frames: 2 },
            dog: { path: 'Dog/Dog', dirs: ['Up', 'Down', 'Left', 'Right'], frames: 2 },
            drone: { path: 'Drone/', dirs: ['Up', 'Down', 'Left', 'Right'], frames: 1 },
            camera: { path: 'Camera/Camera', dirs: ['Left', 'Right'], frames: 2 }
        };

        const loadPromises: Promise<void>[] = [];

        Object.entries(enemyConfig).forEach(([type, config]) => {
            config.dirs.forEach(dir => {
                for (let f = 1; f <= config.frames; f++) {
                    const img = new Image();
                    // Handle inconsistent naming for Camera frame 1
                    let frameSuffix = f.toString();
                    if (type === 'camera' && dir === 'Left' && f === 1) frameSuffix = '';

                    const fileName = `${config.path}${dir}${frameSuffix}.png`;
                    img.src = `/assets/Enemy/${fileName}`;
                    const promise = new Promise<void>((resolve) => {
                        img.onload = () => resolve();
                        img.onerror = () => {
                            console.warn(`Failed to load image: ${fileName}`);
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

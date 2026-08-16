import { Constants } from "@/Helpers/Constants";

declare function showToast(message: string, type?: string, quick?: boolean): void;
import { Difficulty } from "@/Helpers/Enums/Difficulty";
import { Versions } from "@/Helpers/Enums/Versions";
import { Save } from "@/Models/Save";
import { SaveView } from "@/Views/SaveView";
import {Entity} from "@/Models/Entity";

export class SaveController {
    private _save: Save;
    private _saveView: SaveView;

    private _toggleSoloMarks: HTMLButtonElement;
    private _toggleOnlineMarks: HTMLButtonElement;
    private _currentDifficulty: Difficulty;

    private _toggleAchievements: HTMLButtonElement;
    private _currentToggle: boolean;

    private _unlockItems: HTMLButtonElement;
    private _currentToggleItems: boolean;

    private _unlockBestiary: HTMLButtonElement;
    private _modalBestiary: HTMLDivElement;

    private _sins: HTMLButtonElement

    private _downloadButtons: NodeListOf<HTMLButtonElement>;
    private _reloadButtons: NodeListOf<HTMLButtonElement>;
    private _uploadButton: HTMLInputElement;

    constructor(save: Save)
    {
        this._save = save;
        this._saveView = new SaveView(this);
        this._currentDifficulty = Difficulty.HARD;
        this._currentToggle = true;

        this._toggleSoloMarks = document.getElementById("toggle-solo-marks") as HTMLButtonElement;
        this._toggleOnlineMarks = document.getElementById("toggle-online-marks") as HTMLButtonElement;
        this._toggleAchievements = document.getElementById("toggle-achievements") as HTMLButtonElement;
        this._unlockBestiary = document.getElementById("unlock-bestiary") as HTMLButtonElement;
        this._modalBestiary = document.getElementById("modal-bestiary") as HTMLDivElement;
        this._sins = document.getElementById("unlock-sins") as HTMLButtonElement;

        this._downloadButtons = document.querySelectorAll(".download-button");
        this._reloadButtons = document.querySelectorAll(".reload-button");
        this._uploadButton = document.getElementById("upload-button") as HTMLInputElement;

        document.getElementById("close-modal")?.addEventListener("click", () => {
            this._modalBestiary.classList.add("hidden");
        })

        this._unlockItems = document.getElementById("unlock-items") as HTMLButtonElement;
        this._currentToggleItems = true;
        
        save.addObserver(this._saveView);
        this.addEventListeners();
        this.reloadData(false);
    }

    public update() {
        this.setupEventsForIndividuals(); 

    }

    private addEventListeners(): void {
        this._toggleSoloMarks.addEventListener("click", () => {
            this._save.toggleSoloMarks(this._currentDifficulty);
            this.cycleDifficulty();
        });

        this._toggleOnlineMarks.addEventListener("click", () => {
            this._save.toggleOnlineMarks(this._currentDifficulty);
            this.cycleDifficulty();
        });

        this._toggleAchievements.addEventListener("click", () => {
            this._save.toggleAchievements(this._currentToggle);
            this.cycleToggle();
        });

        this._unlockBestiary.addEventListener("click", () => {
            this._save.unlockBestiary();
        });

        this._sins.addEventListener("click", () => {
            this._save.unlockSins();
        });

        this._unlockItems.addEventListener("click", () => {
            this._save.toggleItems(this._currentToggleItems);
            this._currentToggleItems = !this._currentToggleItems;
        })

        this._downloadButtons.forEach((button) => button.addEventListener("click", () => {
            this.cacheData(this._save.data, this._save.get_filename());
            this.downloadFile(this._save.data, this._save.get_filename());
        }));

        this._reloadButtons.forEach((button) => button.addEventListener("click", () => this.reloadData(true)));

        this._uploadButton.addEventListener("click", () => {
            this._uploadButton.value = "";
        });

        this._uploadButton.addEventListener("change", (event) => {
            this.uploadData(event);
        });

        let save_enemy = document.querySelector("#modal-save-changes") as HTMLButtonElement;
        save_enemy.addEventListener("click", () => {
            let enemyId = parseInt(this._modalBestiary.dataset.enemyId!);
            let enemyVariant = parseInt(this._modalBestiary.dataset.enemyVariant!);
            let kills = parseInt((this._modalBestiary.querySelector("#modal-enemy-kills") as HTMLInputElement).value);
            let deaths = parseInt((this._modalBestiary.querySelector("#modal-enemy-deaths") as HTMLInputElement).value);
            let hits = parseInt((this._modalBestiary.querySelector("#modal-enemy-hits") as HTMLInputElement).value);
            let encounters = parseInt((this._modalBestiary.querySelector("#modal-enemy-encounters") as HTMLInputElement).value);

            if (kills < 0 || deaths < 0 || hits < 0 || encounters < 0 ||
                isNaN(kills) || isNaN(deaths) || isNaN(hits) || isNaN(encounters) ||
                kills > 2147483647 || deaths > 2147483647 || hits > 2147483647 || encounters > 2147483647) {
                alert("Please enter valid non-negative integers for kills, deaths, hits, and encounters.");
                return;
            }

            // console.log(kills);
            this._save.updateEnemy(enemyId, enemyVariant, kills, deaths, hits, encounters);
            this._modalBestiary.classList.add('hidden');
            showToast('Enemy updated', 'success', true);
        })
        

        const tabs = document.querySelectorAll('.tab-button') as NodeListOf<HTMLElement>;
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const targetId = tab.id.replace('tab', 'content');
                const targetContent = document.getElementById(targetId);

                tabs.forEach(t => t.classList.toggle('active', t.id === tab.id));

                // Affichage/Masquage des contenus
                contents.forEach(content => content.classList.add('hidden'));
                targetContent?.classList.remove('hidden');

                // Vérifier si le contenu a déjà été chargé
                if (targetContent && !targetContent.dataset.loaded) {
                    let tabName = targetId.replace('content-', '').toLowerCase();
                    this._save.populateContent(tabName);
                    targetContent.dataset.loaded = 'true'; // Marquez comme chargé
                }

                // Fermer le menu mobile si nécessaire
                if (window.innerWidth < 640) {
                    document.getElementById('mobile-menu')?.classList.add('hidden');
                }
            });
        });

        // Initialisation : Cliquez sur le premier onglet
        tabs[0].click();
    }

    private setupEventsForIndividuals(): void {
        let achievements = document.querySelectorAll('.achievements') as NodeListOf<HTMLElement>;
        achievements.forEach((achievement: HTMLElement) => {
            achievement.addEventListener("click", () => {
                let unlocked = achievement.dataset.unlocked == "true";
                this._save.toggleAchievement(parseInt(achievement.dataset.id!), unlocked);
                // console.log(achievement.dataset.id);
                
            });
        });
        
    }

    private cycleDifficulty(): void {
        this._currentDifficulty = (this._currentDifficulty + 1) % Constants.NUMBER_OF_DIFFICULTY;
    }

    private cycleToggle(): void {
        this._currentToggle = !this._currentToggle;
    }
    
    private downloadFile(data: Uint8Array, filename: string) {
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Save exported!');
    }

    private displayMenus() {
        document.querySelectorAll('[id^="tab"]').forEach((element) => {
            if (element.id == "tab-menu") {
                element.classList.add("hidden");
                return;
            }
            if (element.id == "tab-others") return;
            element.classList.remove("hidden");
        });

        document.querySelectorAll('.save-actions').forEach((element) => {
            element.classList.remove("hidden");
            element.classList.add(element.classList.contains("grid") ? "grid" : "flex");
        });

        if (Constants.VERSION_LOADED == Versions.ONLINE) {
            this._toggleOnlineMarks.classList.remove("hidden");
        } else {
            this._toggleOnlineMarks.classList.add("hidden");
        }
    }

    private uploadData(event: Event) {
        let target = event.target as HTMLInputElement;
        let file = target.files![0];
        let reader = new FileReader();
        reader.onload = (event) => {
            let result = event.target!.result as ArrayBuffer;
            let data = new Uint8Array(result);
            let name = file.name;
            this._save.update(data).then(() => {
                this.cacheData(data, name);
                this._save.set_filename(name);
                this.displayMenus();
                let tabs = document.querySelectorAll('.tab-content') as NodeListOf<HTMLElement>;
                tabs.forEach((tab) => {
                    tab.dataset.loaded = ''; // Reset loaded state for all tabs
                })

                this.update();
                document.querySelector<HTMLButtonElement>('#tab-achievements')?.click();
            });
        };
        reader.readAsArrayBuffer(file);


    }

    private reloadData(showConfirmation: boolean): void {
        const storedData = localStorage.getItem("original-save");
        const filename = localStorage.getItem("original-save-filename");
        if (!storedData || !filename) return;

        const binary = atob(storedData);
        const data = Uint8Array.from(binary, character => character.charCodeAt(0));
        this._save.update(data).then(() => {
            this._save.set_filename(filename);
            this.displayMenus();
            document.querySelectorAll<HTMLElement>('.tab-content').forEach((tab) => tab.dataset.loaded = '');
            this.update();
            document.querySelector<HTMLButtonElement>('#tab-achievements')?.click();
            if (showConfirmation) showToast('Saved file restored', 'success');
        });
    }

    private cacheData(data: Uint8Array, filename: string): void {
        localStorage.setItem("original-save", this.encodeData(data));
        localStorage.setItem("original-save-filename", filename);
    }

    private encodeData(data: Uint8Array): string {
        return btoa(Array.from(data, byte => String.fromCharCode(byte)).join(""));
    }

    public toggleAchievement(id: number, unlocked: boolean): void {
        this._save.toggleAchievement(id, !unlocked);
        showToast(unlocked ? 'Achievement locked' : 'Achievement unlocked', 'success', true);
    }

    public toggleCharacterMark(charId: number): void {
        this._save.toggleCharacter(charId, this._currentDifficulty);
    }

    public toggleMark(charId: number, markId: number, difficulty: Difficulty, type: Versions): void {
        let newDifficulty = (difficulty + 1) % 3;
        this._save.toggleMark(charId, markId, newDifficulty, type);
        showToast('Mark updated', 'success', true);
    }

    public toggleItem(id: number, unlocked: boolean): void {
        this._save.toggleItem(id, !unlocked);
        showToast(unlocked ? 'Item unseen' : 'Item seen', 'success', true);
    }

    public toggleChallenge(id: number, unlocked: boolean): void {
        this._save.toggleChallenge(id, !unlocked);
        showToast(unlocked ? 'Challenge reset' : 'Challenge completed', 'success', true);
    }

    public display_modal(entity: Entity) {
        this._modalBestiary.classList.remove('hidden');
        this._modalBestiary.dataset.enemyId = entity.getId().toString();
        this._modalBestiary.dataset.enemyVariant = entity.getVariant().toString();

        this._modalBestiary.querySelector("#modal-enemy-name")!.textContent = entity.getName();
        let a = this._modalBestiary.querySelector("#modal-enemy-kills")! as HTMLInputElement;
        a.value = entity.getKills().toString();

        a = this._modalBestiary.querySelector("#modal-enemy-deaths")! as HTMLInputElement;
        a.value = entity.getDeaths().toString();

        a = this._modalBestiary.querySelector("#modal-enemy-hits")! as HTMLInputElement;
        a.value = entity.getHits().toString();

        a = this._modalBestiary.querySelector("#modal-enemy-encounters")! as HTMLInputElement;
        a.value = entity.getEncounter().toString();

        this._modalBestiary.querySelectorAll("img")!.forEach((img: HTMLImageElement) => {
            img.src = `/assets/gfx/enemies/${entity.getName().replace(/ /g, "_")}.png`;
        })
    }
}

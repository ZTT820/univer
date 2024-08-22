/**
 * Copyright 2023-present DreamNum Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Nullable } from '@univerjs/core';
import { createIdentifier, Disposable, Tools } from '@univerjs/core';
import type { IRectPopupProps } from '@univerjs/design';
import type { IBoundRectNoAngle } from '@univerjs/engine-render';
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

export interface IPopup extends Pick<IRectPopupProps, 'closeOnSelfTarget' | 'direction' | 'excludeOutside' | 'onClickOutside' > {
    anchorRect: Nullable<IBoundRectNoAngle>;
    anchorRect$: Observable<IBoundRectNoAngle>;
    excludeRects?: IBoundRectNoAngle[];
    excludeRects$?: Observable<IBoundRectNoAngle[]>;
    componentKey: string;

    unitId: string;
    subUnitId: string;

    offset?: [number, number];
    canvasElement: HTMLCanvasElement;
    hideOnInvisible?: boolean;
}

export interface ICanvasPopupService {
    addPopup(item: IPopup): string;
    removePopup(id: string): void;
    removeAll(): void;
    popups$: Observable<[string, IPopup][]>;

    get popups(): [string, IPopup][];
}

export const ICanvasPopupService = createIdentifier<ICanvasPopupService>('ui.popup.service');

export class CanvasPopupService extends Disposable implements ICanvasPopupService {
    private readonly _popupMap = new Map<string, IPopup>();
    private readonly _popups$ = new BehaviorSubject<[string, IPopup][]>([]);
    readonly popups$ = this._popups$.asObservable();
    get popups() { return Array.from(this._popupMap.entries()); }

    private _update() {
        this._popups$.next(Array.from(this._popupMap.entries()));
    }

    override dispose(): void {
        super.dispose();

        this._popups$.next([]);
        this._popups$.complete();
        this._popupMap.clear();
    }

    addPopup(item: IPopup): string {
        const id = Tools.generateRandomId();
        this._popupMap.set(id, item);
        this._update();
        return id;
    }

    removePopup(id: string): void {
        if (this._popupMap.delete(id)) {
            this._update();
        }
    }

    removeAll(): void {
        this._popupMap.clear();
        this._update();
    }
}

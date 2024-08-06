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

import type { Dependency, DependencyIdentifier, IDisposable, Nullable, UnitModel, UnitType } from '@univerjs/core';
import { createIdentifier, Disposable, Inject, Injector, IUniverInstanceService, remove, toDisposable, UniverInstanceType } from '@univerjs/core';
import type { Observable } from 'rxjs';
import { BehaviorSubject, Subject } from 'rxjs';

import type { BaseObject } from '../base-object';
import type { DocComponent } from '../components/docs/doc-component';
import type { SheetComponent } from '../components/sheets/sheet-component';
import type { Slide } from '../components/slides/slide';
import { Engine } from '../engine';
import { Scene } from '../scene';
import { type IRender, RenderUnit } from './render-unit';

export type RenderComponentType = SheetComponent | DocComponent | Slide | BaseObject;

export interface IRenderManagerService extends IDisposable {
    /** @deprecated */
    currentRender$: Observable<Nullable<string>>;

    addRender(unitId: string, renderer: IRender): void;
    createRender(unitId: string): IRender;
    removeRender(unitId: string): void;
    setCurrent(unitId: string): void;
    /**
     * get RenderUnit By Id, RenderUnit implements IRender
     * @param unitId
     */
    getRenderById(unitId: string): Nullable<IRender>;
    getAllRenderersOfType(type: UniverInstanceType): RenderUnit[];
    getCurrentTypeOfRenderer(type: UniverInstanceType): Nullable<RenderUnit>;
    getRenderAll(): Map<string, IRender>;
    defaultEngine: Engine;

    // DEPT@Jocs
    // Editor should not be coupled in docs-ui. It should be an common service resident in @univerjs/ui.
    // However, currently the refactor is not completed so we have to throw an event and let
    // docs-ui to create the editor's renderer.

    /** @deprecated */
    createRender$: Observable<string>;
    /** @deprecated this design is very very weird! Remove it. */
    create(unitId: string): void;

    created$: Observable<IRender>;
    disposed$: Observable<string>;

    /** @deprecated There will be multi units to render at the same time, so there is no *current*. */
    getCurrent(): Nullable<IRender>;
    /** @deprecated There will be multi units to render at the same time, so there is no *first*. */
    getFirst(): Nullable<IRender>;

    has(unitId: string): boolean;
    withCurrentTypeOfUnit<T>(type: UniverInstanceType, id: DependencyIdentifier<T>): Nullable<T>;

    registerRenderModule<T extends UnitModel>(type: UnitType, dep: Dependency<T>): IDisposable;
}

const DEFAULT_SCENE_SIZE = { width: 1500, height: 1000 };

const SCENE_NAMESPACE = '_UNIVER_SCENE_';

export class RenderManagerService extends Disposable implements IRenderManagerService {
    private _defaultEngine!: Engine;

    private _currentUnitId: string = '';

    private _renderMap: Map<string, IRender> = new Map();

    private readonly _currentRender$ = new BehaviorSubject<Nullable<string>>(this._currentUnitId);
    readonly currentRender$ = this._currentRender$.asObservable();

    private readonly _createRender$ = new Subject<string>();
    /** @deprecated */
    readonly createRender$ = this._createRender$.asObservable();

    private readonly _renderCreated$ = new Subject<IRender>();
    readonly created$ = this._renderCreated$.asObservable();

    private readonly _renderDisposed$ = new Subject<string>();
    readonly disposed$ = this._renderDisposed$.asObservable();

    get defaultEngine() {
        if (!this._defaultEngine) {
            this._defaultEngine = new Engine();
        }
        return this._defaultEngine;
    }

    private readonly _renderDependencies = new Map<UnitType, Dependency[]>();

    constructor(
        @Inject(Injector) private readonly _injector: Injector,
        @IUniverInstanceService private readonly _univerInstanceService: IUniverInstanceService
    ) {
        super();
    }

    override dispose() {
        super.dispose();

        this._renderMap.forEach((item) => this._disposeItem(item));
        this._renderDependencies.clear();
        this._renderMap.clear();
        this._currentRender$.complete();

        this._renderCreated$.complete();
        this._renderDisposed$.complete();
    }

    registerRenderModules(type: UnitType, deps: Dependency[]): IDisposable {
        if (!this._renderDependencies.has(type)) {
            this._renderDependencies.set(type, []);
        }

        const dependencies = this._renderDependencies.get(type)!;
        dependencies.push(...deps);

        for (const [_, render] of this._renderMap) {
            const renderType = render.type;
            if (renderType === type) {
                this._tryAddRenderDependencies(render, deps);
            }
        }

        return toDisposable(() => {
            deps.forEach((dep) => remove(dependencies, dep));
        });
    }

    registerRenderModule(type: UnitType, ctor: Dependency): IDisposable {
        if (!this._renderDependencies.has(type)) {
            this._renderDependencies.set(type, []);
        }

        const dependencies = this._renderDependencies.get(type)!;
        dependencies.push(ctor);

        for (const [_, render] of this._renderMap) {
            const renderType = render.type;
            if (renderType === type) {
                this._tryAddRenderDependencies(render, [ctor]);
            }
        }

        return toDisposable(() => remove(dependencies, ctor));
    }

    private _getRenderControllersForType(type: UnitType): Array<Dependency> {
        return Array.from(this._renderDependencies.get(type) ?? []);
    }

    create(unitId: string) {
        this._createRender$.next(unitId);
    }

    createRender(unitId: string): IRender {
        const renderer = this._createRender(unitId, new Engine());
        this._renderCreated$.next(renderer);
        return renderer;
    }

    getAllRenderersOfType(type: UniverInstanceType): RenderUnit[] {
        const renderUnits: RenderUnit[] = [];
        for (const [_, render] of this._renderMap) {
            const renderType = render.type;
            if (renderType === type) {
                renderUnits.push(render as RenderUnit);
            }
        }

        return renderUnits;
    }

    getCurrentTypeOfRenderer(type: UniverInstanceType): Nullable<RenderUnit> {
        const current = this._univerInstanceService.getCurrentUnitForType(type);
        if (!current) return null;

        return this.getRenderById(current.getUnitId()) as RenderUnit;
    }

    withCurrentTypeOfUnit<T>(type: UniverInstanceType, id: DependencyIdentifier<T>): Nullable<T> {
        const current = this._univerInstanceService.getCurrentUnitForType(type);
        if (!current) return null;

        return this.getRenderById(current.getUnitId())?.with(id);
    }

    private _tryAddRenderDependencies(renderer: IRender, deps: Dependency[]): void {
        if (renderer instanceof RenderUnit) {
            renderer.addRenderDependencies(deps);
        }
    }

    private _createRender(unitId: string, engine: Engine, isMainScene: boolean = true): IRender {
        const existItem = this.getRenderById(unitId);
        let shouldDestroyEngine = true;

        if (existItem != null) {
            const existEngine = existItem.engine;
            if (existEngine === engine) {
                shouldDestroyEngine = false;
            }
        }

        this._disposeItem(existItem, shouldDestroyEngine);

        const { width, height } = DEFAULT_SCENE_SIZE;

        const scene = new Scene(SCENE_NAMESPACE + unitId, engine, {
            width,
            height,
        });

        const unit = this._univerInstanceService.getUnit(unitId);
        let renderUnit: IRender;

        if (unit) {
            const type = this._univerInstanceService.getUnitType(unitId);
            const ctors = this._getRenderControllersForType(type);
            renderUnit = this._injector.createInstance(RenderUnit, {
                unit,
                engine,
                scene,
                isMainScene,
            });

            this._tryAddRenderDependencies(renderUnit, ctors);
        } else {
            // For slide pages
            renderUnit = {
                isThumbNail: true,
                type: UniverInstanceType.UNIVER_SLIDE,
                unitId,
                engine,
                scene,
                mainComponent: null,
                components: new Map(),
                isMainScene,
                // @ts-ignore
                with(_dependency) {
                    return null;
                },
            };
        }

        this._addRenderUnit(unitId, renderUnit);
        return renderUnit;
    }

    addRender(unitId: string, item: IRender) {
        this._addRenderUnit(unitId, item);
    }

    private _addRenderUnit(unitId: string, item: IRender) {
        this._renderMap.set(unitId, item);
    }

    removeRender(unitId: string) {
        const item = this._renderMap.get(unitId);
        if (item != null) {
            this._disposeItem(item);
        }

        this._renderMap.delete(unitId);
    }

    has(unitId: string) {
        return this._renderMap.has(unitId);
    }

    setCurrent(unitId: string) {
        this._currentUnitId = unitId;

        this._currentRender$.next(unitId);
    }

    getCurrent() {
        return this._renderMap.get(this._currentUnitId);
    }

    getFirst() {
        return [...this.getRenderAll().values()][0];
    }

    getRenderById(unitId: string): Nullable<IRender> {
        return this._renderMap.get(unitId);
    }

    getRenderAll() {
        return this._renderMap;
    }

    private _disposeItem(item: Nullable<IRender>, shouldDestroyEngine: boolean = true) {
        if (item == null) {
            return;
        }

        const { engine, scene, components } = item;

        // `mainComponent` is one of the `components` so it does not to be disposed again
        components?.forEach((component) => component.dispose());
        scene.dispose();

        if (isDisposable(item)) {
            item.dispose();
        }

        if (shouldDestroyEngine) {
            engine.dispose();
        }

        this._renderDisposed$.next(item.unitId);
    }
}

export const IRenderManagerService = createIdentifier<IRenderManagerService>('engine-render.render-manager.service');

export function isDisposable(thing: unknown): thing is IDisposable {
    // eslint-disable-next-line ts/no-explicit-any
    return !!thing && typeof (thing as any).dispose === 'function';
}

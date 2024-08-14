export interface StateModule {
    serialize(): any;
    deserialize(data: any): void;
  }
  
  export class GameState {
    private modules: { [key: string]: StateModule } = {};
  
    registerModule(name: string, module: StateModule) {
      this.modules[name] = module;
    }
  
    getModule<T extends StateModule>(name: string): T {
      return this.modules[name] as T;
    }
  
    serialize(): string {
      const serializedModules: { [key: string]: any } = {};
      for (const [name, module] of Object.entries(this.modules)) {
        serializedModules[name] = module.serialize();
      }
      return JSON.stringify(serializedModules);
    }
  
    deserialize(jsonString: string): void {
      const serializedModules = JSON.parse(jsonString);
      for (const [name, data] of Object.entries(serializedModules)) {
        if (this.modules[name]) {
          this.modules[name].deserialize(data);
        } else {
          console.warn(`Module ${name} not found during deserialization`);
        }
      }
    }
  }
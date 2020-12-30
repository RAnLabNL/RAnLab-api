import {DataLayer, Filters, IdObject, Region} from "../../src/database/productionDataLayer";
import {Business} from "../../src/endpoints/businesses";

export class DummyDatalayer implements DataLayer {
  businesses: Business[] = [];
  regions: Region[] = [];

  getBusinessesByRegion(_:string): Promise<Business[]> {
    return Promise.resolve(this.businesses);
  }

  async setBusiness(business:Business): Promise<IdObject> {
    this.businesses.push(business);
    return {id:"1"};
  }

  async getFilters(_: string): Promise<Filters> {
    return {
      years: this.businesses.map((b) => b.year_added),
      industries: this.businesses.map((b) => b.industry)
    };
  }

  async setRegion(region: Region): Promise<IdObject> {
    this.regions.push(region);
    return {id: region.id};
  }

  async getAllRegions() : Promise<Region[]> {
    return this.regions;
  }

  async getRegionsManagedBy(managerId: string ): Promise<Region[]> {
    return this.regions.filter((r) => managerId === r.manager);
  }

  async deleteRegion(regionId: string): Promise<void> {
    this.regions = this.regions.filter((r) => r.id !== regionId);
  }

  clearRegions() {
    this.regions = [];
  }
}

import {DataLayer, Filters, IdObject, Region} from "../../src/database/productionDataLayer";
import {Business} from "../../src/endpoints/businesses";
import { EditRequest } from "../../src/endpoints/editRequest";

export class DummyDatalayer implements DataLayer {

  businesses: Business[] = [];
  regions: Region[] = [];
  editRequests: EditRequest[] = [];

  getBusinessesByRegion(_:string): Promise<Business[]> {
    return Promise.resolve(this.businesses);
  }

  async setBusiness(business:Business): Promise<IdObject> {
    let id = `${Math.random()}`;
    this.businesses.push({...business, id});
    let regionIndex = this.regions.findIndex((r) => r.name == business.regionId);
    let bizRegion = this.regions[regionIndex]
    if(!bizRegion.filters) {
      bizRegion.filters = {};
    }
    if(!bizRegion.filters.industries) {
      bizRegion.filters.industries = [];
    }
    let industryIndex = bizRegion.filters.industries.findIndex((i) => i.industry === business.industry);
    if(industryIndex < 0) {
      bizRegion.filters.industries.push({industry: business.industry, count: 1});
    } else {
      bizRegion.filters.industries[industryIndex].count++;
    }
    return {id};
  }

  async getFilters(regionId: string): Promise<Filters> {
    return {
      years: this.businesses.filter(b => b.regionId=== regionId).map((b) => b.year_added),
      industries: this.businesses.filter(b => b.regionId=== regionId).map((b) => b.industry)
    };
  }

  async setRegion(region: Region): Promise<IdObject> {
    this.regions.push(region);
    return {id: region.name};
  }

  async getAllRegions() : Promise<Region[]> {
    return this.regions;
  }

  async getRegionsManagedBy(managerId: string ): Promise<Region[]> {
    return this.regions.filter((r) => managerId === r.manager);
  }

  async deleteRegion(regionId: string): Promise<void> {
    this.regions = this.regions.filter((r) => r.name !== regionId);
  }

  async createEditRequest(editRequest: EditRequest): Promise<IdObject> {
    const newRequest = {...editRequest, id: new Date().toISOString() + Math.random()}
    this.editRequests.push(newRequest);
    return {id: newRequest.id} ;
  }

  async getEditRequestsForRegion(regionId: string): Promise<EditRequest[]> {
    return this.editRequests.filter((req) => req.regionId === regionId);
  }

  async getAllEditRequests(): Promise<EditRequest[]> {
    return this.editRequests;
  }

  async getEditRequestById(id: string): Promise<EditRequest | null> {
    return this.editRequests.find((req) => req.id === id) || null;
  }

  async updateEditRequest(body: EditRequest): Promise<EditRequest> {
    let index = this.editRequests.findIndex((req) => req.id === body.id);
    this.editRequests[index] = {...this.editRequests[index], ...body};
    return this.editRequests[index];
  }

  async getEditRequestsByStatus(status: string): Promise<EditRequest[]> {
    return this.editRequests.filter((req) => req.status === status);
  }

  async getBusinessById(id: string): Promise<Business | null> {
    return this.businesses.find((b) => b.id === id) || null;
  }


  clearRegions() {
    this.regions = [];
  }
}

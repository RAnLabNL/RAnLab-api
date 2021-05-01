import {DataLayer, Filters, IdObject, Region} from "../../src/database/productionDataLayer";
import {Business, CHUNK_SIZE} from "../../src/endpoints/businesses";
import {EditRequest} from "../../src/endpoints/editRequest";

export class DummyDatalayer implements DataLayer {
  businesses: Business[] = [];
  regions: Region[] = [];
  editRequests: EditRequest[] = [];
  industries: string[] = [];

  async getBusinessById(id: string): Promise<Business | null> {
    return this.businesses.find((b) => b.id === id) || null;
  }

  async getBusinessesByRegion(_:string): Promise<Business[]> {
    return Promise.resolve(this.businesses);
  }

  async getAllBusinesses(afterId?: string): Promise<Business[]> {
    let startIndex = this.businesses.findIndex(biz => biz.id === afterId);
    startIndex = startIndex > 0 ? startIndex + 1 : 0;
    return this.businesses.slice(startIndex, startIndex + CHUNK_SIZE);
  }

  async deleteBusiness(id: string): Promise<void> {
    let startIndex = this.businesses.findIndex(biz => biz.id === id);
    startIndex = startIndex > 0 ? startIndex : 0;
    this.businesses.splice(startIndex, 1);
  }

  async setBusiness(business:Business): Promise<IdObject> {
    if(!business.id) {
      business.id = `${Math.random()}`;
      this.businesses.push({...business});
    } else {
      this.businesses[this.businesses.findIndex(b => b.id == business.id)] = business;
    }
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
    return {id: business.id};
  }

  async getFilters(regionId: string): Promise<Filters> {
    if(!regionId) {
      return {industries: this.industries};
    } else {
      return {
        years: this.businesses.filter(b => b.regionId === regionId).map((b) => b.year_added),
        industries: this.businesses.filter(b => b.regionId === regionId).map((b) => b.industry)
      };
    }
  }

  async setRegion(region: Region): Promise<IdObject> {
    this.regions.push({...region, id: region.name});
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

  async getEditRequestById(id: string): Promise<EditRequest | null> {
    return this.editRequests.find((req) => req.id === id) || null;
  }

  async getEditRequestsForRegion(regionId: string, pageSize: number, afterId?: string): Promise<EditRequest[]> {
    return this.getPaginatedEditRequests(pageSize, afterId, req => req.regionId === regionId);
  }

  async getAllEditRequests(pageSize: number, afterId?: string): Promise<EditRequest[]> {
    return this.getPaginatedEditRequests(pageSize, afterId, () => true);
  }

  async getEditRequestsByStatus(status: string, pageSize: number, afterId?: string): Promise<EditRequest[]> {
    return this.getPaginatedEditRequests(pageSize, afterId, (req) => req.status === status);
  }

  async getEditRequestsByUser(userAppId: string, pageSize: number, afterId?: string): Promise<EditRequest[]> {
    return this.getPaginatedEditRequests(pageSize, afterId, (r) => r.submitter === userAppId);
  }

  async updateEditRequest(body: EditRequest): Promise<EditRequest> {
    let index = this.editRequests.findIndex((req) => req.id === body.id);
    this.editRequests[index] = {...this.editRequests[index], ...body};
    return this.editRequests[index];
  }

  async addIndustries(industries: string[]): Promise<void[]> {
    this.industries.push(...industries);
    return [];
  }

  async deleteIndustries(industries: string[]): Promise<any[]> {
    this.industries = this.industries.filter(i => !industries.find(i2 => i2 === i));
    return Promise.resolve([]);
  }

  getPaginatedEditRequests(pageSize: number, afterId: string | undefined, filter: (r: EditRequest) => boolean) {
    this.editRequests.reverse();
    let startIndex = !!afterId? this.editRequests.findIndex((r) => r.id === afterId) + 1 : 0;
    let ret =  this.editRequests.filter(filter).slice(startIndex, startIndex + pageSize);
    this.editRequests.reverse();
    return ret;
  }

  clearRegions() {
    this.regions = [];
  }

}

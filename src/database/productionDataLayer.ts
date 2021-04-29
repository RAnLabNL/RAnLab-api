import {Business, CHUNK_SIZE} from "../endpoints/businesses";
import {EditRequest} from "../endpoints/editRequest";
import {
  DocumentData, DocumentSnapshot,
  FieldValue,
  Firestore,
  Query,
  QueryDocumentSnapshot,
  Timestamp,
  Transaction
} from "@google-cloud/firestore";

export interface IdObject {
  id: string
}

interface RegionFilters {
  years?: {year: number, count: number}[] | undefined,
  industries?: {industry: string, count: number}[] | undefined
}

export interface Region {
  id?: string | undefined,
  name: string,
  manager: string,
  filters?: RegionFilters
}

export interface Filters {
  years?: number[] | undefined,
  industries?: string[]
}

export interface DataLayer {
  getBusinessById(id: string): Promise<Business | null>;
  getAllBusinesses(afterId?: string): Promise<Business[]>;
  getBusinessesByRegion(region: string): Promise<Business[]>;
  setBusiness(business: Business) : Promise<IdObject>;
  deleteBusiness(id: string): Promise<void>;
  getFilters(regionId?: string) : Promise<Filters>;
  getRegionsManagedBy(managerId: string) : Promise<Region[]>;
  getAllRegions(): Promise<Region[]>;
  setRegion(region: Region): Promise<IdObject>;
  deleteRegion(regionId: string): Promise<void>;
  getEditRequestById(id: string): Promise<EditRequest | null>;
  getAllEditRequests(pageSize: number, afterId?: string): Promise<EditRequest[]>;
  getEditRequestsForRegion(regionId: string, pageSize: number, afterId?: string): Promise<EditRequest[]>;
  getEditRequestsByStatus(status: string, pageSize: number, afterId?: string): Promise<EditRequest[]>;
  getEditRequestsByUser(userAppId: string, pageSize: number, afterId?: string): Promise<EditRequest[]>;
  createEditRequest(add: EditRequest): Promise<IdObject>;
  updateEditRequest(body: EditRequest): Promise<EditRequest>;
  addIndustries(industries: string[]): Promise<void>;
  deleteIndustries(industries: string[]) : Promise<any[]>;
}

export class ProductionDataLayer implements DataLayer {
  firestore: Firestore;
  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  async getBusinessById(id: string): Promise<Business | null> {
    let businessSnapshot = await this.firestore.collection("businesses").doc(id).get();
    return <Business>{...businessSnapshot.data(), id: businessSnapshot.id};
  }

  async getBusinessesByRegion(regionId: string) : Promise<Business[]> {
    let businessSnapshot = await this.firestore.collection("businesses").where("regionId", "==", regionId).get();
    return businessSnapshot.docs.map((b) => (<Business>{...b.data(), id: b.id}));
  }

  async getAllBusinesses(afterId?: string): Promise<Business[]> {
    let query = this.firestore.collection("businesses")
      .orderBy("name")
      .limit(CHUNK_SIZE);
    if(!!afterId) {
      let afterBiz = await this.firestore.collection("businesses").doc(afterId).get();
      if(afterBiz) {
        query = query.startAfter(afterBiz);
      }
    }
    return this.convertToBusinesses((await query.get()).docs);
  }

  async setBusiness(newBusinessData: Business) : Promise<IdObject> {
    const bc = this.firestore.collection("businesses");
    let businessRef = newBusinessData.id ? bc.doc(newBusinessData.id) : bc.doc();
    let regionRef = this.firestore.collection("regions").doc(newBusinessData.regionId);
    return this.firestore.runTransaction(async transaction => {
      let regionDoc = await transaction.get(regionRef);
      if(!regionDoc.exists) {
        throw "Bad Region";
      }
      let filters = ProductionDataLayer.getCurrentFilters(regionDoc);
      let businessDoc = await transaction.get(businessRef);
      let updates : RegionFilters = {
        years: [{year: newBusinessData.year_added, count: 1}],
        industries: [{industry: newBusinessData.industry, count: 1}]
      };

      if(businessDoc.exists) {
        let existingBusinessData = businessDoc.data();
        if(!!existingBusinessData) {
          // @ts-ignore no idea why it thinks updates can be undefined here.
          updates.years.push(
            {year: existingBusinessData.year_added, count: -1},
          );
          // @ts-ignore no idea why it thinks updates can be undefined here.
          updates.industries.push(
            {industry: existingBusinessData.industry, count: -1},
          );
        }
      }

      await transaction.update(regionRef, {filters: this.calculateNewFilters(filters, updates)})
      await transaction.set(businessRef, newBusinessData);
    }).then(() => <IdObject>{id: businessRef.id});
  }

  async deleteBusiness(id: string) {
    await this.firestore.runTransaction(
      async transaction => {
        let businessRef = this.firestore.collection("businesses").doc(id);
        let businessDoc = await transaction.get(businessRef);
        let businessData = businessDoc.data();
        if (!!businessData) {
          if (!!businessData.regionId) {
            let deleteBizFromFilter = {
              years: [{year: businessData.year_added, count: -1}],
              industries: [{industry: businessData.industry, count: -1}]
            }

            await this.updateRegionFilters(businessData.regionId, deleteBizFromFilter, transaction);
          }
          await transaction.delete(businessRef);
        }
      }
    );
  }

  async getFilters(region?: string) : Promise<Filters>{
    if(!!region) {
      let regionData = (await this.firestore.collection("regions").doc(region).get()).data();
      regionData = !!regionData ? regionData : {};
      return regionData.filters;
    } else {
      let industries: string[] = [];
      let industryData = (await this.firestore.collection("industries").get()).docs;
      industryData.forEach(i => industries.push(i.id));
      return {industries};
    }
  }

  async getAllRegions() : Promise<Region[]> {
    let regionsSnapshot = await this.firestore.collection("regions").get();
    return regionsSnapshot.docs.map((r) => ({id: r.id, name: r.data().name, manager: r.data().manager}));
  }

  async getRegionsManagedBy(managerId: string): Promise<Region[]> {
    let regionsSnapshot = await this.firestore.collection("regions").where("manager", "==", managerId).get();
    return regionsSnapshot.docs.map((r) => ({id: r.id, name: r.data().name, manager: r.data().manager}));
  }

  async setRegion(region: Region): Promise<IdObject> {
    let regionDoc = !!region.id
      ?  this.firestore.collection("regions").doc(region.id)
      : this.firestore.collection("regions").doc();
    await regionDoc.set({name: region.name, "manager": region.manager}, {merge: true});
    return {id: regionDoc.id};
  }

  async deleteRegion(id: string): Promise<void> {
    await this.firestore.collection("regions").doc(id).delete();
  }

  async createEditRequest(editRequest: EditRequest): Promise<IdObject> {
    let doc = this.firestore.collection("editRequests").doc();
    await doc.set({
      ...editRequest,
      dateSubmitted: FieldValue.serverTimestamp(),
      dateUpdated: FieldValue.serverTimestamp()
    });
    return {id :  doc.id};
  }

  async getEditRequestById(id: string) : Promise<EditRequest | null> {
    let requestData = (await this.firestore.collection("editRequests").doc(id).get()).data();
    return this.convertToEditRequest(id, requestData);
  }

  async updateEditRequest(body: EditRequest): Promise<EditRequest> {
    let id = !!body.id ? body.id : "";
    let requestData = (await this.firestore.collection("editRequests").doc(id).get()).data();
    let updatedRequestData = {
      ...this.convertToEditRequest(id, requestData),
      ...body,
      dateUpdated: FieldValue.serverTimestamp()
    };
    await this.firestore.collection("editRequests").doc(id).update(updatedRequestData);
    let updatedRequest = await this.getEditRequestById(id);
    if(!updatedRequest) {
      throw "Could not retrieve updated record!";
    } else {
      return updatedRequest;
    }
  }

  async getAllEditRequests(pageSize: number, afterId?: string): Promise<EditRequest[]> {
    let query = this.firestore.collection("editRequests");
    return await this.getPaginatedEditRequests(query, pageSize, afterId);
  }

  async getEditRequestsForRegion(regionId: string, pageSize: number,afterId?: string) : Promise<EditRequest[]> {
    let query = this.firestore.collection("editRequests").where("regionId", "==", regionId);
    return this.getPaginatedEditRequests(query, pageSize, afterId);
  }

  async getEditRequestsByStatus(status: string, pageSize: number, afterId?: string): Promise<EditRequest[]> {
    let query = this.firestore.collection("editRequests").where("status", "==", status);
    return await this.getPaginatedEditRequests(query, pageSize, afterId);
  }

  async getEditRequestsByUser(userAppId: string, pageSize: number, afterId?: string): Promise<EditRequest[]> {
    let query = this.firestore.collection("editRequests").where("submitter", "==", userAppId);
    return this.getPaginatedEditRequests(query, pageSize, afterId);
  }

  async addIndustries(industries: string[]): Promise<void> {
    industries.forEach(
      i => this.firestore.collection("industries").doc(i).set({active: true})
    );
  }

  async deleteIndustries(industries: string[]) : Promise<any[]>{
    let promises: Promise<any>[] = []
    for(let i = 0; i < industries.length; i++) {
      promises.push(this.firestore.collection("industries").doc(industries[i]).delete());
    }
    return Promise.all(promises);
  }


  private async getPaginatedEditRequests(query: Query, pageSize: number, afterId: string | undefined) {
    let requests: EditRequest[] = [];
    query = query.orderBy("dateSubmitted", 'desc').limit(pageSize);
    if (!!afterId) {
      let afterRecord = await this.firestore.collection("editRequests").doc(afterId).get();
      query = query.startAfter(afterRecord);
    }

    let editRequestDocs = (await query.get()).docs;
    editRequestDocs.forEach(
      (doc) => {
        let converted = this.convertToEditRequest(doc.id, doc.data());
        if (!!converted) {
          requests.push(converted);
        }
      }
    );
    return requests;
  }

  convertToEditRequest(id: string, documentData: DocumentData | undefined) : EditRequest | null {
    if(!!documentData) {
      let request = <EditRequest>documentData;
      request.dateSubmitted = (<Timestamp>(documentData.dateSubmitted)).toDate();
      request.dateUpdated = (<Timestamp>(documentData.dateUpdated)).toDate();
      request.id = id;
      return request;
    } else {
      return null;
    }
  }

  convertToBusinesses(docs: Array<QueryDocumentSnapshot>) : Business[] {
    let businesses = [];
    for(let doc of docs) {
      let biz : Business = {
        id: doc.id,
        regionId: doc.data().regionId,
        name: doc.data().name,
        employees: doc.data().employees,
        industry: doc.data().industry,
        year_added: doc.data().year_added
      }
      if(!!doc.data().location) {
        biz.location = doc.data().location
      }
      businesses.push(biz);
    }
    return businesses;
  }

  private async updateRegionFilters(regionId: string, filterUpdate: RegionFilters, transaction: Transaction) {
    let regionRef = this.firestore.collection("regions").doc(regionId);
    let regionDoc = await transaction.get(regionRef);
    if (!!regionDoc) {
      let regionData = regionDoc.data();
      if (!!regionData) {
        let updatedFilters = this.calculateNewFilters(regionData.filters, filterUpdate);
        let regionUpdate = {filters: updatedFilters};

        await transaction.update(regionRef, regionUpdate)
      }
    }
  }

  private calculateNewFilters(filters: RegionFilters, updates: RegionFilters) {
    let years : {year: number, count: number}[] = !!filters.years ? filters.years : [];
    let industries : {industry: string, count: number}[] = !!filters.industries ? filters.industries : [];
    if(!!updates.years && updates.years.length > 0) {
      for(let yearUpdate of updates.years) {
        let yearEntryIndex = years.findIndex(y => y.year === yearUpdate.year);
        if (yearEntryIndex < 0) {
          years.push({year: yearUpdate.year, count: yearUpdate.count});
        } else {
          years[yearEntryIndex].count += yearUpdate.count;
        }
      }
      for(let i = years.length-1; i >=0; i--) {
        if(years[i].count <= 0) {
          years.splice(i,1);
        }
      }
    }

    if(!!updates.industries && updates.industries.length > 0) {
      for(let industryUpdate of updates.industries) {
        let industryEntryIndex = industries.findIndex(i => i.industry === industryUpdate.industry);
        if (industryEntryIndex < 0) {
          industries.push(industryUpdate);
        } else {
          industries[industryEntryIndex].count += industryUpdate.count;
        }
        for(let i = industries.length-1; i >=0; i--) {
          if(industries[i].count <= 0) {
            industries.splice(i,1);
          }
        }
      }
    }
    return {years, industries};
  }

  private static getCurrentFilters(regionDoc: DocumentSnapshot) : RegionFilters{
    let regionData = !!regionDoc && !!regionDoc.data() ? regionDoc.data() : {filters: {}};
    if(!!regionData) {
      return !!regionData.filters ? regionData.filters : {};
    } else {
      return {};
    }
  }

}


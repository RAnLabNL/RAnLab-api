import {Business} from "../endpoints/businesses";
import {firestore} from "./firestore";
import { EditRequest } from "../endpoints/editRequest";
import firebase from "firebase";
import Timestamp = firebase.firestore.Timestamp;

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
  setBusiness(business: Business) : Promise<IdObject>;
  getBusinessById(id: string): Promise<Business | null>;
  getBusinessesByRegion(region: string): Promise<Business[]>;
  getFilters(regionId: string) : Promise<Filters>;
  getRegionsManagedBy(managerId: string) : Promise<Region[]>;
  setRegion(region: Region): Promise<IdObject>;
  deleteRegion(regionId: string): Promise<void>;
  getAllRegions(): Promise<Region[]>;
  createEditRequest(add: EditRequest): Promise<IdObject>;
  getEditRequestsForRegion(regionId: string): Promise<EditRequest[]>;
  getAllEditRequests(): Promise<EditRequest[]>;
  getEditRequestById(id: string): Promise<EditRequest | null>;
  updateEditRequest(body: EditRequest): Promise<EditRequest>;
  getEditRequestsByStatus(pending: string): Promise<EditRequest[]>;
}

export class ProductionDataLayer implements DataLayer {
  async getBusinessById(id: string): Promise<Business | null> {
    let businessSnapshot = await firestore.collection("businesses").doc(id).get();
    return <Business>{...businessSnapshot.data(), id: businessSnapshot.id};
  }

  async getBusinessesByRegion(regionId: string) : Promise<Business[]> {
    let businessSnapshot = await firestore.collection("businesses").where("regionId", "==", regionId).get();
    return businessSnapshot.docs.map((b) => (<Business>{...b.data(), id: b.id}));
  }

  async setBusiness(newBusinessData: Business) : Promise<IdObject> {
    const bc = firestore.collection("businesses");
    let businessRef = newBusinessData.id ? bc.doc(newBusinessData.id) : bc.doc();
    let regionRef = firestore.collection("regions").doc(newBusinessData.regionId);
    return firestore.runTransaction(async transaction => {
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

  async getFilters(region: string) : Promise<Filters>{
    let regionData = (await firestore.collection("regions").doc(region).get()).data();
    regionData = !!regionData ? regionData : {};
    return regionData.filters;
  }

  async getAllRegions() : Promise<Region[]> {
    let regionsSnapshot = await firestore.collection("regions").get();
    return regionsSnapshot.docs.map((r) => ({id: r.id, name: r.data().name, manager: r.data().manager}));
  }

  async getRegionsManagedBy(managerId: string): Promise<Region[]> {
    let regionsSnapshot = await firestore.collection("regions").where("manager", "==", managerId).get();
    return regionsSnapshot.docs.map((r) => ({id: r.id, name: r.data().name, manager: r.data().manager}));
  }

  async setRegion(region: Region): Promise<IdObject> {
    let regionDoc = !!region.id ?  firestore.collection("regions").doc(region.id) : firestore.collection("regions").doc();
    await regionDoc.set({name: region.name, "manager": region.manager}, {merge: true});
    return {id: regionDoc.id};
  }

  async deleteRegion(id: string): Promise<void> {
    await firestore.collection("regions").doc(id).delete();
  }

  async deleteBusiness(id: string) {
    await firestore.runTransaction(
      async transaction => {
        let businessRef = firestore.collection("businesses").doc(id);
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

  async createEditRequest(editRequest: EditRequest): Promise<IdObject> {
    let doc = firestore.collection("editRequests").doc();
    await doc.set(editRequest);
    return {id :  doc.id};
  }

  async getEditRequestsForRegion(regionId: string) : Promise<EditRequest[]> {
    let regionRequests : EditRequest[] = [];
    (await firestore.collection("editRequests").where("regionId", "==", regionId).get()).docs.forEach(
      (req) => {
        let converted = this.convertToEditRequest(req.id, req.data());
        if (!!converted) {
          regionRequests.push(converted);
        }
      }
    );
    return regionRequests;
  }

  async getAllEditRequests(): Promise<EditRequest[]> {
    let allRequests: EditRequest[] = [];
    (await firestore.collection("editRequests").get()).docs.forEach(
      (req) => {
        let converted = this.convertToEditRequest(req.id, req.data());
        if (!!converted) {
          allRequests.push(converted);
        }
      }
    );
    return allRequests;
  }

  async getEditRequestById(id: string) : Promise<EditRequest | null> {
    let requestData = (await firestore.collection("editRequests").doc(id).get()).data();
    return this.convertToEditRequest(id, requestData);
  }

  async updateEditRequest(body: EditRequest): Promise<EditRequest> {
    let id = !!body.id ? body.id : "";
    let requestData = await this.getEditRequestById(id);
    let updatedRequestData = {...requestData, ...body};
    await firestore.collection("editRequests").doc(id).set(updatedRequestData)
    return Promise.resolve(updatedRequestData);
  }

  async getEditRequestsByStatus(status: string): Promise<EditRequest[]> {
    let requests = <EditRequest[]>[];
    (await firestore.collection("editRequests").where("status", "==", status).get()).docs.forEach(
      (req) => {
        let converted = this.convertToEditRequest(req.id, req.data());
        if (!!converted) {
          requests.push(converted);
        }
      }
    );
    return requests;
  }

  convertToEditRequest(id: string, documentData: firebase.firestore.DocumentData | undefined) : EditRequest | null {
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


  private async updateRegionFilters(regionId: string, filterUpdate: RegionFilters, transaction: firebase.firestore.Transaction) {
    let regionRef = firestore.collection("regions").doc(regionId);
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

  private static getCurrentFilters(regionDoc: firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>) : RegionFilters{
    let regionData = !!regionDoc && !!regionDoc.data() ? regionDoc.data() : {filters: {}};
    if(!!regionData) {
      return !!regionData.filters ? regionData.filters : {};
    } else {
      return {};
    }
  }
}

export const productionDataLayer = new ProductionDataLayer();

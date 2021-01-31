import {Business} from "../endpoints/businesses";
import {firestore} from "./firestore";
import firebase from "firebase";
import {AddRequest, DeleteRequest, UpdateRequest} from "../endpoints/editRequests";

export interface IdObject {
  id: string
}

export interface Region {
  id?: string | undefined,
  name: string,
  manager: string,
  filters?: {
    years?: { year: number, count: number }[] | undefined,
    industries?: { industry: string, count: number }[] | undefined,
  }
}

export interface Filters {
  years?: number[] | undefined,
  industries?: string[]
}

export interface DataLayer {
  setBusiness(business: Business) : Promise<IdObject>;
  getBusinessesByRegion(region: string): Promise<Business[]>;
  getFilters(regionId: string) : Promise<Filters>;
  getRegionsManagedBy(managerId: string) : Promise<Region[]>;
  setRegion(region: Region): Promise<IdObject>;
  deleteRegion(regionId: string): Promise<void>;
  getAllRegions(): Promise<Region[]>;
  createAddRequest(add: AddRequest): Promise<AddRequest>;
  createUpdateRequest(updateRequest: UpdateRequest): Promise<UpdateRequest>;
  createDeleteRequests(deleteRequest: DeleteRequest): Promise<DeleteRequest>;
}


export class ProductionDataLayer implements DataLayer {
  async createAddRequest(addRequest: AddRequest): Promise<AddRequest> {
    let doc = firestore.collection("editRequests").doc();
    await doc.set(addRequest);
    addRequest.id = doc.id;
    return addRequest;
  }

  async createUpdateRequest(updateRequest: UpdateRequest): Promise<UpdateRequest> {
    let doc = firestore.collection("editRequests").doc();
    await doc.set(updateRequest);
    updateRequest.id = doc.id;
    return updateRequest;
  }

  async createDeleteRequests(deleteRequest: DeleteRequest): Promise<DeleteRequest> {
    let doc = firestore.collection("editRequests").doc();
    await doc.set(deleteRequest);
    deleteRequest.id = doc.id;
    return deleteRequest;
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
      let {years, industries} = this.calculateNewFilters(regionDoc, newBusinessData, 1);

      let businessDoc = await transaction.get(businessRef);
      if(businessDoc.exists) {
        let existingBusinessData = businessDoc.data();
        if(!!existingBusinessData && !!existingBusinessData.year_added) {
          // @ts-ignore I don't know why, but it thinks existingBusinessData could be null here, despite the enclosing if statement
          let oldYearIndex = years.findIndex((y) => y.year === existingBusinessData.year_added);
          if(oldYearIndex >= 0) {
            if (years[oldYearIndex].count > 1) {
              years[oldYearIndex].count -= 1;
            } else {
              years.splice(oldYearIndex, 1);
            }
          }
        }
        if (!!existingBusinessData && !!existingBusinessData.industry) {
          // @ts-ignore I don't know why, but it thinks existingBusinessData could be null here, despite the enclosing if statement
          let existingIndustryIndex = industries.findIndex(i => i.industry === existingBusinessData.industry);
          if(existingIndustryIndex >= 0) {
            if (industries[existingIndustryIndex].count > 1) {
              industries[existingIndustryIndex].count -= 1;
            } else {
              industries.splice(existingIndustryIndex, 1);
            }
          }
        }
      }
      let regionUpdate = {filters: {years: years, industries: industries}};

      await transaction.update(regionRef, regionUpdate)
      await transaction.set(businessRef, newBusinessData);
    }).then(() => <IdObject>{id: businessRef.id});
  }

  async getFilters(region: string) : Promise<Filters>{
    let regionData = (await firestore.collection("regions").doc(region).get()).data();
    regionData = !!regionData ? regionData : {};
    return {
      years: regionData.years ? regionData.years : [],
      industries: regionData.industries ? regionData.industries : []
    };
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
            let regionRef = firestore.collection("regions").doc(businessData.regionId);
            let regionDoc = await transaction.get(regionRef);
            let {years, industries} = this.calculateNewFilters(regionDoc, businessData, -1);

            let regionUpdate = {filters: {years: years, industries: industries}};

            await transaction.update(regionRef, regionUpdate)
          }
          await transaction.delete(businessRef);
        }
      }
    );
  }

  private calculateNewFilters(regionDoc: firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>, businessData: firebase.firestore.DocumentData , change: number) {
    let regionData = regionDoc.data();
    let years: { year: number, count: number }[] = !!regionData && !!regionData.years ? regionData.years : [];
    let yearEntryIndex = years.findIndex(y => y.year === businessData.year_added);
    if (yearEntryIndex < 0 && change > 0)  {
      years.push({year: businessData.year_added, count: change});
    } else if (years[yearEntryIndex].count + change > 0) {
      years[yearEntryIndex].count += change;
    } else {
      years.splice(yearEntryIndex, 1);
    }

    let industries: { industry: string, count: number }[] = !!regionData && !!regionData.industries ? regionData.industries : [];
    let industryEntryIndex = industries.findIndex(i => i.industry === businessData.industry);
    if (industryEntryIndex < 0 && change > 0) {
      industries.push({industry: businessData.industry, count: change});
    } else if (industries[industryEntryIndex].count + change > 0) {
      industries[industryEntryIndex].count += change;
    } else {
      industries.splice(industryEntryIndex, 1);
    }
    return {years, industries};
  }
}

export const productionDataLayer = new ProductionDataLayer();

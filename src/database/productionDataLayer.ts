import {Business} from "../endpoints/businesses";
import {firestore} from "./firestore";
import firebase from "firebase";

export interface IdObject {
  id: string
}

export interface Region {
  id: string,
  manager: string,
  years?: {year: number, count: number}[] | undefined,
  industries?: {industry: string, count: number}[] | undefined,
}

export interface DataLayer {
  setBusiness(business: Business) : Promise<IdObject>;
  getBusinessesByRegion(region: string): Promise<Business[]>;
  getFilters(regionId: string) : Promise<Filters>;
  getRegionsManagedBy(managerId: string) : Promise<Region[]>;
  setRegion(region: Region): Promise<IdObject>;
  deleteRegion(regionId: string): Promise<void>;
  getAllRegions(): Promise<Region[]>;
}

export interface Filters {
  years?: number[] | undefined,
  industries?: string[]
}

export class ProductionDataLayer implements DataLayer {
  async getBusinessesByRegion(region: string) : Promise<Business[]> {
    let businessSnapshot = await firestore.collection("businesses").where("region", "==", region).get();
    return businessSnapshot.docs.map((b) => (<Business>{...b.data(), id: b.id}));
  }

  async setBusiness(newBusinessData: Business) : Promise<IdObject> {
    const bc = firestore.collection("businesses");
    let businessRef = newBusinessData.id ? bc.doc(newBusinessData.id) : bc.doc();
    let regionRef = firestore.collection("regions").doc(newBusinessData.region);
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
      let update = {years: years, industries: industries};

      await transaction.update(regionRef, update)
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
    return regionsSnapshot.docs.map((r) => ({id: r.id, manager: r.data().manager}));
  }

  async getRegionsManagedBy(managerId: string): Promise<Region[]> {
    let regionsSnapshot = await firestore.collection("regions").where("manager", "==", managerId).get();
    return regionsSnapshot.docs.map((r) => ({id: r.id, manager: r.data().manager}));
  }

  async setRegion(region: Region): Promise<IdObject> {
    await firestore.collection("regions").doc(region.id).set({"manager": region.manager});
    return {id: region.id};
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
        if (!!businessData && !!businessData.region) {
          let regionRef = firestore.collection("regions").doc(businessData.region);
          let regionDoc = await transaction.get(regionRef);
          let {years, industries} = this.calculateNewFilters(regionDoc, businessData, -1);

          let update = {years: years, industries: industries};

          await transaction.update(regionRef, update)
          await transaction.delete(businessRef)
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

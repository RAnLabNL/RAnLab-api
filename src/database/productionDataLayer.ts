import {Business} from "../endpoints/businesses";
import {firestore} from "./firestore";

export interface IdObject {
  id: string
}

export interface Region {
  id: string,
  manager: string
}

export interface DataLayer {
  setBusiness(business: Business) : Promise<IdObject>;
  getBusinessesByRegion(region: string): Promise<Business[]>;
  getFilters(regionId: string) : Promise<Filters>;
  getRegionsManagedBy(managerId: string) : Promise<Region[]>;
  setRegion(region: Region): Promise<IdObject>;
  deleteRegion(regionId: string): Promise<void>;
}

export interface Filters {
  years?: number[] | undefined
}

export class ProductionDataLayer implements DataLayer {
  async getBusinessesByRegion(region: string) : Promise<Business[]> {
    let businessSnapshot = await firestore.collection("businesses").where("region", "==", region).get();
    return businessSnapshot.docs.map((b) => (<Business>{...b.data(), id: b.id}));
  }

  async setBusiness(business: Business) : Promise<IdObject> {
    const bc = firestore.collection("businesses");
    let businessRef = business.id ? bc.doc(business.id) : bc.doc();
    await businessRef.set(business);
    await firestore.collection("years").doc(`${business.year_added}`).set({});
    return <IdObject>{id: businessRef.id};
  }

  async getFilters(region: string) : Promise<Filters>{
    return {
      years: (await firestore.collection("businesses").where("region", "==", region).get()).docs
                .map((b) => <number>((<Business>b.data()).year_added))
    };
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
    await firestore.collection("businesses").doc(id).delete();
  }
}

export const productionDataLayer = new ProductionDataLayer();

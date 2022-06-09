import { AppConfig } from "../utils/AppConfig";
import { IOsloBucketItem } from "./IOsloBucketItem";
import { error, getDayDifference, trace } from "../utils/Utils";
import { IOsloItem } from "./IOsloItem";
import localforage from "localforage";

export enum DataLocation {
  Local,
  Backend,
}

// TODO: check if cache should be initialized once plugin is rendered or only when it is needed
export class OsloCache {
  private static instance: OsloCache;

  /** Maps the first word of Oslo key phrases to buckets (arrays) of tuples of {full key phrase, number of words}. */
  // FIXME: is this used?
  private osloLookupMap: Map<string, IOsloBucketItem[]>;

  /** Cache for Oslo data items */
  private _osloLookupEntries: IOsloItem[];

  private constructor() { }

  public get osloLookupEntries(): IOsloItem[] {
    if (!this._osloLookupEntries) {
      error("Oslo data was not yet set in cache.");
    }

    return this._osloLookupEntries;
  }

  public set osloLookupEntries(value: IOsloItem[]) {
    this._osloLookupEntries = value;
  }

  private static async build(): Promise<void> {
    const updateTimestamp: string = await localforage.getItem("updateTimestamp");
    let dataLocation: DataLocation;

    if (updateTimestamp) {
      const dayDifference = getDayDifference(updateTimestamp);

      if (dayDifference >= 1) {
        dataLocation = DataLocation.Backend;
      } else {
        dataLocation = DataLocation.Local;
      }
    } else {
      dataLocation = DataLocation.Backend;
    }

    OsloCache.instance = new OsloCache();

    if (dataLocation === DataLocation.Backend) {
      OsloCache.instance.loadDataFromBackend();
    } else {
      await OsloCache.instance.loadLocalData();
    }
  }

  public static async getInstance(): Promise<OsloCache> {
    if (!OsloCache.instance) {
      await OsloCache.build();
    }

    return OsloCache.instance;
  }

  private async loadLocalData(): Promise<void> {
    const data: IOsloItem[] = await localforage.getItem("osloItems");

    if (!data) {
      // TODO: load data from backend
      error("No OSLO data that could be loaded locally");
    }

    this.osloLookupEntries = data;
  }

  private loadDataFromBackend(): void {
    // The first cache is a simple list of Oslo result items
    // Load the data from the web server. We're assuming a simple GET without authentication.
    this.httpRequest("GET", AppConfig.dataFileUrl)
      .then((json: string) => {
        if (!json) {
          error("Oslo data empty");
        }

        const data = JSON.parse(json);
        this.osloLookupEntries = this.parseOsloResult(data);

        // Sort the entries on keyphrase (case insensitive)
        this.osloLookupEntries = this.osloLookupEntries.sort((a, b) => a.keyphrase.localeCompare(b.keyphrase));

        // The second cache maps the first word of the item key phrase onto a bucket (array).
        // Each item in the bucket contains the full key phrase and the number of words in the key phrase.
        // This cache is used when searching through the Word text, matching any key phrases from the Oslo data set.
        this.osloLookupMap = new Map<string, IOsloBucketItem[]>();

        for (const osloEntry of this.osloLookupEntries) {
          // Split the key phrase to get the first word and the number of words
          let words = osloEntry.keyphrase.split(" ");
          let keyEntry = <IOsloBucketItem>{};
          keyEntry.keyphrase = osloEntry.keyphrase;
          keyEntry.numWords = words.length;

          // Store same first word items in the same cache bucket
          let list = this.osloLookupMap.get(words[0]);

          if (!list) {
            // Create a bucket if needed
            list = [];
            this.osloLookupMap.set(words[0], list);
          }

          list.push(keyEntry);
        }

        trace(
          "OSLO data cache initialized, " +
          this.osloLookupEntries.length +
          " items, " +
          this.osloLookupMap.size +
          " buckets"
        );

        localforage.setItem("updateTimestamp", new Date(Date.now()));
        localforage.setItem("osloItems", this.osloLookupEntries);
      })
      .catch((error) => {
        trace("Error: " + error);
      });
  }

  /** Asynchronously retrieves the string data response from the HTTP request for the given URL. */
  private async httpRequest(verb: "GET" | "PUT", url: string): Promise<string> {
    return new Promise<string>((resolve) => {
      const request = new XMLHttpRequest();

      // Callback after request.send()
      request.onload = function () {
        if (request.status === 200) {
          // HTTP request successful, resolve the promise with the response body
          resolve(request.response);
        } else {
          // HTTP request failed
          error(`Error after ${verb} from ${url} : ${request.status} ${request.statusText}`);
          resolve(null);
        }
      };

      request.open(verb, url, true /* async */);
      request.send();
    });
  }

  /** Parses the Oslo data, which is basically the raw JSON response of an Elasticsearch query on the OSLO terminology dataset. */
  private parseOsloResult(elasticData: any): IOsloItem[] {
    let data: IOsloItem[] = [];

    if (elasticData && elasticData.hits && elasticData.hits.hits) {
      // Loop through all the Elasticsearch result items
      for (let item of elasticData.hits.hits) {
        item = item._source;
        // Convert the result items into our own objects
        let osloEntry: IOsloItem = {
          label: item.prefLabel ? item.prefLabel : "",
          keyphrase: item.prefLabel ? item.prefLabel.toLowerCase() : "",
          description: item.definition,
          reference: item.id,
        };
        // And store the data objects in a list
        if (osloEntry.keyphrase && osloEntry.description) {
          data.push(osloEntry);
        }
      }
    }
    return data;
  }

  /** Looks up the given phrase in the OSLO database */
  public osloLookup(phrase: string, useExactMatching: boolean): IOsloItem[] {
    if (!phrase) {
      return null;
    }

    phrase = phrase.toLowerCase().trim();

    const matches: IOsloItem[] = [];

    for (const item of this.osloLookupEntries) {
      if (useExactMatching) {
        if (item.keyphrase == phrase) {
          matches.push(item);
        }
      } else if (item.keyphrase.lastIndexOf(phrase) >= 0) {
        matches.push(item);
      }
    }

    return matches;
  }
}
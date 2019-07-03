require("dotenv").config();
const axios = require("axios");
const moment = require("moment");
const _ = require("lodash");

const paymo = axios.create({
  baseURL: "https://app.paymoapp.com/api/",
  headers: {
    Accept: "application/json"
  },
  auth: {
    username: process.env.PAYMO_USERNAME,
    password: process.env.PAYMO_PASSWORD
  }
});

const datetimeFormat = "YYYY-MM-DDTHH:00:00";
const dayStart =
  moment()
    .startOf("day")
    .format(datetimeFormat) + "Z";
const dayEnd =
  moment()
    .endOf("day")
    .format(datetimeFormat) + "Z";

paymo
  .get(`entries?where=time_interval in ("${dayStart}","${dayEnd}")`)
  .then(async ({ data: { entries } }) => {
    const myEntries = entries.filter(
      entry => entry.user_id === _.parseInt(process.env.PAYMO_USER_ID)
    );
    const data = await Promise.all(
      myEntries.map(async entry => {
        const {
          data: { tasks }
        } = await paymo.get(`tasks/${entry.task_id}`);
        const {
          data: { projects }
        } = await paymo.get(`projects/${entry.project_id}`);
        return {
          project: {
            name: projects[0].name,
            code: projects[0].code
          },
          task: {
            name: tasks[0].name,
            code: tasks[0].code
          },
          description: entry.description
        };
      })
    );
    const projGroups = _.groupBy(data, "project.name");
    const projStrings = _.keys(projGroups).map(key => {
      const entries = projGroups[key];
      const taskGroups = _.groupBy(entries, "task.name");
      const taskString = _.keys(taskGroups)
        .map(key => {
          const descs = taskGroups[key]
            .map(entry => entry.description && _.lowerCase(entry.description))
            .filter(Boolean)
            .join(", ");
          return `${_.capitalize(key)}${descs ? ` (${descs})` : ""}`;
        })
        .join(", ");
      return `- ${_.startCase(key)} - ${taskString}`;
    });
    console.log(`================================

today:
${projStrings.join("\n")}

next day:

================================`);
  })
  .catch(err => {
    // console.error(err);
  });

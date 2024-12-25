**Glupp Shitto's titanic nasdaq festivus scripto** (also known as "crimbo") is a script meant to help [Kingdom of Loathing](https://www.kingdomofloathing.com/) players efficiently collect crimbo stuff in KoL.

To install, run the following command on an up-to-date [KolMafia](https://github.com/kolmafia/kolmafia) version:

```
git checkout loathers/crimbo release
```

To update, run `git update` or check the "Update installed Git projects on login" box within Mafia preferences.

## Running Crimbo

To run crimbo, run the following command in the mafia GCLI:

`crimbo`

You can specify the number of turns to run (use negative numbers for the number of turns remaining) with the turns argument. The following example will use 10 turns.

`crimbo turns=10`

You must specify which island to adventure in.

`crimbo island=easter`
`crimbo island=stpatricksday`
`crimbo island=veteransday`
`crimbo island=thanksgiving`
`crimbo island=christmas`

Use the help argument for more details and other options.

`crimbo help`

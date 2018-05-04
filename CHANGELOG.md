# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Notes]


## [Unreleased]
### Changed
## 1.1.3 (2018-05-04)
<a name="1.1.3"></a>
### Added
* Entry type and API file generation.
* Balance type and API file generation.
* /entry/list route.
* /balance/list route.

## 1.1.2 (2018-05-04)
<a name="1.1.2"></a>
### Added
* New field in template "isRecordName", this provides MoSQL a way to display
  the record identifiers by using more apropiated fields than the primary key.
### Changed
* Changes to API.js to use model metadata and remove config object needs.
* Adjustments to MoScaffold API file generation to support API.js changes.
* MoSQL.recordName() now uses "isRecordName" to provide display names for models
  instead of Primary Key fields.

<a name="1.1.1"></a>
## 1.1.1 (2018-04-20)
### Added
* MoScaffold module with Type file and API file generation.
* Routes for movement listing and generator run.

<a name="1.1.0"></a>
## 1.1.0 (2018-02-27)
### Changed
* Current status :-)
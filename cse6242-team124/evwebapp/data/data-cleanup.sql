alter table ev_title_reg drop column "VIN(1-10)";
alter table ev_title_reg drop column "VehiclePrimaryUse";
alter table ev_title_reg drop column "OdometerReading";
alter table ev_title_reg drop column "OdometerCode";
alter table ev_title_reg drop column "NeworUsedVehicle";
alter table ev_title_reg drop column "SalePrice";
alter table ev_title_reg drop column "SaleDate";
alter table ev_title_reg drop column "BaseMSRP";
alter table ev_title_reg drop column "2015HB2778ExemptionEligibility";
alter table ev_title_reg drop column "2019HB2042CleanAlternativeFuelVehicle(CAFV)Eligibility";
alter table ev_title_reg drop column "Meets2019HB2042ElectricRangeRequirement";
alter table ev_title_reg drop column "Meets2019HB2042SaleDateRequirement";
alter table ev_title_reg drop column "Meets2019HB2042SalePrice/ValueRequirement";
alter table ev_title_reg drop column "2019HB2042:BatteryRangeRequirement";
alter table ev_title_reg drop column "2019HB2042:PurchaseDateRequirement";
alter table ev_title_reg drop column "2019HB2042:SalePrice/ValueRequirement";
alter table ev_title_reg drop column "ElectricVehicleFeePaid";
alter table ev_title_reg drop column "TransportationElectrificationFeePaid";
alter table ev_title_reg drop column "HybridVehicleElectrificationFeePaid";
alter table ev_title_reg drop column "2020CensusTract";

delete from ev_title_reg
where TransactionType not in ('Original Title', 'Transfer Title');

vacuum;

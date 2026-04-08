import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FloorsModalComponent } from 'app/main/apps/admin/institution-masters/floors/floors-modal/floors-modal.component';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-add-setup',
  templateUrl: './add-setup.component.html',
  styleUrls: ['./add-setup.component.scss']
})
export class AddSetupComponent implements OnInit {

  private isActive = CONSTANTS.isActive;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private ResultValidation = CONSTANTS.ResultValidation;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private regulationCrudUrl = CONSTANTS.regulationCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;

  resultValidations: GeneralDetail[] = [];
  dialogTitle;
  marksSetupForm: FormGroup;
  regulations = [];
  searchReg = [];
  regulationIds = [];

  public publisherFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredpublishers: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public publisherMultiCtrl: FormControl = new FormControl();

  constructor(private genericFunctions: GenericFunctions , private formBuilder: FormBuilder, private dialogRef: MatDialogRef<FloorsModalComponent>,
              @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService,
              private crudService: CrudService, public router: Router) {  
      this.generalDetails();
     }

  ngOnInit(): void {

    this.dialogTitle = 'Add Exam Setup Master';
    this.marksSetupForm = this.formBuilder.group({
      markSetupName: ['', Validators.required],
      isHavingoptions: [false],
      resultvalidationCatId: [0],
      isActive: [],
      reason: []
  });

    this.marksSetupForm.get('isActive').setValue(true);
    this.marksSetupForm.get('reason').setValue('active');

    if (!this.isEmptyObject(this.data)){
       this.getRegulations();
    }

    if (!this.isEmptyObject(this.data) && this.data.examFCARSetMasterId){
    this.marksSetupForm.get('markSetupName').setValue(this.data.markSetupName);
    this.marksSetupForm.get('isHavingoptions').setValue(this.data.isHavingoptions);
    this.marksSetupForm.get('resultvalidationCatId').setValue(this.data.resultvalidationCatId);
    this.marksSetupForm.get('isActive').setValue(this.data.isActive);
    this.marksSetupForm.get('reason').setValue(this.data.reason);
    this.dialogTitle = 'Edit Exam Setup Master';
    for (let i = 0; i < this.data.regulationIds.split(',').length; i++){
      this.regulationIds.push(+this.data.regulationIds.split(',')[i]);
    }
    this.publisherMultiCtrl.setValue(this.regulationIds);
    }

    this.searchReg.push({publishername: 'Search by Regulation.'});
    this.filteredpublishers.next(this.searchReg.slice());

    this.publisherFilterCtrl.valueChanges
    .pipe(takeUntil(this._onDestroy))
    .subscribe(() => {
      this.filterRegulations();
    });
  }

  filterRegulations(): void {
    if (!this.searchReg) {
      return;
    }
    // get the search keyword
    let search = this.publisherFilterCtrl.value;
    if (!search) {
      this.filteredpublishers.next(this.searchReg.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredpublishers.next(
      this.searchReg.filter(x => x.regulationCode.toLowerCase().indexOf(search) > -1)
    );
  }

    getRegulations(): void{
      this.crudService.listDetailsByThreeIdsWithSort(this.regulationCrudUrl, this.data.collegeId, this.data.courseId, 'true', 'desc',
      this.getDetailsByCollegeIdUrl, this.getDetailsByCourseIdUrl, this.isActive, 'regulationCode')
      .subscribe(result => {
          if (result.statusCode === 200) {
              if (result.data.resultList && result.data.resultList !== '') {
                  this.regulations = result.data.resultList;
                  this.searchReg = result.data.resultList;
                  this.filteredpublishers.next(this.searchReg.slice());
              } else {
                  this.snotifyService.success(result.message, 'Success!');
              }
          } else {
              this.snotifyService.error(result.message, 'Error!');
          }
      }, error => {
          if (error.error.statusCode === 401){
              this.snotifyService.error(error.error.message, 'Error!');
              this.genericFunctions.logOut(this.router.url);
          }else{
              this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
      });
    }
   
   /*----------- SUBJECT TYPE -----------*/
    generalDetails(): void{

   this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.ResultValidation, 'true', this.generalDetailsByCodeUrl, this.isActive)
   .subscribe(result => {
       if (result.statusCode === 200){
                   if (result.data.resultList && result.data.resultList !== '') {
                       this.resultValidations = result.data.resultList;
                   } else {
                       this.snotifyService.success(result.message, 'Success!');
                   }
               }else {
                   this.snotifyService.error(result.message, 'Error!');
               }
       }, error => {
       if (error.error.statusCode === 401){
           this.snotifyService.error(error.error.message, 'Error!');
           this.genericFunctions.logOut(this.router.url);
       }else{
           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
       }
   });
  }

  submit(): void{
    const Obj = this.marksSetupForm.value;
    for (let i = 0; i < this.publisherMultiCtrl.value.length; i++){
                        
      if (i === 0){
        Obj.regulationIds = this.publisherMultiCtrl.value[i];
      }else{
        Obj.regulationIds = Obj.regulationIds + ',' + this.publisherMultiCtrl.value[i];
      }

    }
    if (this.marksSetupForm.invalid) {
            return;
        }else{
          this.dialogRef.close(Obj);
        }
  }
  
  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

}

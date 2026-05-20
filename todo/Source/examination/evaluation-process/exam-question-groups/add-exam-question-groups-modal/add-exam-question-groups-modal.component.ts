import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Country } from 'app/main/models/country';
import { State } from 'app/main/models/state';
import { District } from 'app/main/models/district';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CampusModalComponent } from 'app/main/apps/admin/campus/campus-modal/campus-modal.component';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { College } from 'app/main/models/college';
import { storeMaster } from 'app/main/models/store';
import { Organization } from 'app/main/models/organization';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
@Component({
  selector: 'app-add-exam-question-groups-modal',
  templateUrl: './add-exam-question-groups-modal.component.html',
  styleUrls: ['./add-exam-question-groups-modal.component.scss']
})
export class AddExamQuestionGroupsModalComponent implements OnInit {

 
 
  addquestionpaperGroupsForm: FormGroup;
  organizations: Organization[] = [];
  colleges: College[] = [];
  employees: any[] = [];
  settingValues = [];
  searchColleges = [];
  questionpapers = [];
  subunits = [];
  dialogTitle;
  questionpapermarks = []

  private organizationsCrudUrl = CONSTANTS.organizationsCrudUrl;
  private getDetailsByOrganizationIdUrl = CONSTANTS.getDetailsByOrganizationIdUrl;
  private isActive = CONSTANTS.isActive;
  private employeeSearchUrl = CONSTANTS.employeeSearchUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;

  public collegeFilterCtrl: FormControl = new FormControl();
  public collegeMultiCtrl: FormControl = new FormControl();
  public filteredColleges: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  public employeeFilterCtrl: FormControl = new FormControl();
  public employeeSingleCtrl: FormControl = new FormControl();
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  private _onDestroy = new Subject<void>();
  @ViewChild('singleSelect') singleSelect: MatSelect;

  constructor(private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<CampusModalComponent>,
    @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService,
    private crudService: CrudService, public router: Router) {
// this.getColleges();
}
  ngOnInit(): void {
    this.dialogTitle = 'Create Questionpaper Marks';
    this.addquestionpaperGroupsForm = this.formBuilder.group({
      questionPaperId: ['', Validators.required],
        questionGroupName: ['', Validators.required],
        questionPaperMarksId: ['', Validators.required],
        bestOfAnswers: ['', Validators.required],
        isSingleGroup: ['', Validators.required],
        Subunits: ['', Validators.required],
        isActive: [],
        reason: []
    });
    this.addquestionpaperGroupsForm.get('isActive').setValue(true);
    this.addquestionpaperGroupsForm.get('reason').setValue('active');
    
  }



isEmptyObject(obj) {
  return (obj && (Object.keys(obj).length === 0));
}

submit(): void {
  
}

}

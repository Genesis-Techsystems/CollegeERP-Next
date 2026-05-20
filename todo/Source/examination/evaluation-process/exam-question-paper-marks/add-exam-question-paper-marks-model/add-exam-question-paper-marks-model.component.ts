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
  selector: 'app-add-exam-question-paper-marks-model',
  templateUrl: './add-exam-question-paper-marks-model.component.html',
  styleUrls: ['./add-exam-question-paper-marks-model.component.scss']
})
export class AddExamQuestionPaperMarksModelComponent implements OnInit {

 
  addquestionpaperMarksForm: FormGroup;
  organizations: Organization[] = [];
  colleges: College[] = [];
  employees: any[] = [];
  settingValues = [];
  searchColleges = [];
  questionpapers = [];
  subunits = [];
  dialogTitle;

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
    this.addquestionpaperMarksForm = this.formBuilder.group({
      QuestionNumber: ['', Validators.required],
        organizationId: ['', Validators.required],
        QuestionCode: ['', Validators.required],
        Question: ['', Validators.required],
        QuestionMarks: ['', Validators.required],
        ModelAnswer1: ['', Validators.required],
        ModelAnswer2: ['', Validators.required],
        ModelAnswer3: ['', Validators.required],
        Subunits: ['', Validators.required],
        isActive: [],
        reason: []
    });
    this.addquestionpaperMarksForm.get('isActive').setValue(true);
    this.addquestionpaperMarksForm.get('reason').setValue('active');
    
  }



isEmptyObject(obj) {
  return (obj && (Object.keys(obj).length === 0));
}

submit(): void {
  
}

}

import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { NgxSpinnerService } from 'ngx-spinner';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-view-exam-fee-structure',
  templateUrl: './view-exam-fee-structure.component.html',
  styleUrls: ['./view-exam-fee-structure.component.scss']
})
export class ViewExamFeeStructureComponent implements OnInit {

  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ViewExamFeeStructureComponent>, private genericFunctions: GenericFunctions,
              @Inject(MAT_DIALOG_DATA) public data, private spinner: NgxSpinnerService,
              private snotifyService: SnotifyService, private crudService: CrudService, public router: Router) {
      
   }

  // tslint:disable-next-line:typedef
  ngOnInit() {
  }

}

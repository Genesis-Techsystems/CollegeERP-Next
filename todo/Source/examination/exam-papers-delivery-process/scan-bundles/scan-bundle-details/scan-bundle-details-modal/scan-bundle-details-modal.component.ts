import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';

@Component({
  selector: 'app-scan-bundle-details-modal',
  templateUrl: './scan-bundle-details-modal.component.html',
  styleUrls: ['./scan-bundle-details-modal.component.scss']
})
export class ScanBundleDetailsModalComponent implements OnInit {

  examCenterForm: FormGroup;
  dialogTitle = '';

  examlCenterList = [];

  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ScanBundleDetailsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService, private router: Router,
    private crudService: CrudService, private genericFunctions: GenericFunctions) {

  }

  ngOnInit(): void {
    this.examCenterForm = this.formBuilder.group({
      isActive: [],
      reason: []

    });
    if (!this.isEmptyObject(this.data)) {
      this.examCenterForm.get('isActive').setValue(true);
      this.examCenterForm.get('reason').setValue('');
      this.dialogTitle = 'Exam Scan Bundle Details';

    }
  }
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  submit(): void {
    if (this.examCenterForm.invalid) {
      return;
    } else {
      this.data.isActive = this.examCenterForm.value.isActive,
        this.data.reason = this.examCenterForm.value.reason,
        this.data.updatedUser = +localStorage.getItem('employeeId'),
        this.dialogRef.close(this.data);
    }
  }
}
